const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes
  message: { error: 'Trop de requêtes depuis cette IP, veuillez réessayer après 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));
app.use('/api/', apiLimiter);

// Configuration PostgreSQL
const dbConfig = {
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'photo_studio'}`
};

// Autoriser le SSL pour les bases de données Cloud (Render, Supabase, Neon, etc.)
if (process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost')) {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

// Pool de connexions PostgreSQL
let pool;

async function initDatabase() {
  try {
    pool = new Pool(dbConfig);
    
    // Test de connexion
    const client = await pool.connect();
    client.release();
    
    // Créer les tables
    await createTables();
    console.log('✅ Base de données PostgreSQL initialisée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
}

async function createTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Table des administrateurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(255) UNIQUE,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: ajouter role
    await client.query('SAVEPOINT migration_admin_role');
    try {
      await client.query("ALTER TABLE admins ADD COLUMN role VARCHAR(20) DEFAULT 'admin'");
      // Promouvoir le premier utilisateur existant au rang de super admin
      await client.query("UPDATE admins SET role = 'super_admin' WHERE id = (SELECT id FROM admins ORDER BY id ASC LIMIT 1)");
      await client.query('RELEASE SAVEPOINT migration_admin_role');
    } catch (e) { await client.query('ROLLBACK TO SAVEPOINT migration_admin_role'); }

    // Migration: ajouter name et email si absents
    await client.query('SAVEPOINT migration_admin_name');
    try {
      await client.query('ALTER TABLE admins ADD COLUMN name VARCHAR(100)');
      await client.query('RELEASE SAVEPOINT migration_admin_name');
    } catch (e) { await client.query('ROLLBACK TO SAVEPOINT migration_admin_name'); }
    await client.query('SAVEPOINT migration_admin_email');
    try {
      await client.query('ALTER TABLE admins ADD COLUMN email VARCHAR(255) UNIQUE');
      await client.query('RELEASE SAVEPOINT migration_admin_email');
    } catch (e) { await client.query('ROLLBACK TO SAVEPOINT migration_admin_email'); }

    // Table des séances
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(6) UNIQUE NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        admin_id INT REFERENCES admins(id) ON DELETE CASCADE
      )
    `);

    // Migration pour les bases existantes (utilise SAVEPOINT pour ne pas annuler toute la transaction)
    await client.query('SAVEPOINT migration_admin_id');
    try {
      await client.query('ALTER TABLE sessions ADD COLUMN admin_id INT REFERENCES admins(id) ON DELETE CASCADE');
      
      // Assigner les sessions existantes au premier admin (s'il y en a) pour éviter les incohérences
      const { rows: adminsFound } = await client.query('SELECT id FROM admins ORDER BY id ASC LIMIT 1');
      if (adminsFound.length > 0) {
        await client.query('UPDATE sessions SET admin_id = $1 WHERE admin_id IS NULL', [adminsFound[0].id]);
      }
      await client.query('RELEASE SAVEPOINT migration_admin_id');
    } catch (e) {
      // La colonne existe déjà — on rollback uniquement ce savepoint
      await client.query('ROLLBACK TO SAVEPOINT migration_admin_id');
    }

    
    await client.query('CREATE INDEX IF NOT EXISTS idx_code ON sessions(code)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_expires ON sessions(expires_at)');

    // Table des photos
    await client.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        session_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        data_url TEXT NOT NULL,
        size INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_session ON photos(session_id)');

    // Créer l'admin par défaut si aucun n'existe
    const result = await client.query('SELECT COUNT(*) as count FROM admins');
    if (parseInt(result.rows[0].count, 10) === 0) {
      const defaultPassword = await bcrypt.hash('studio123', 10);
      await client.query(
        'INSERT INTO admins (username, password_hash, role) VALUES ($1, $2, $3)',
        ['admin', defaultPassword, 'super_admin']
      );
      console.log('✅ Admin par défaut créé (admin/studio123)');
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Middleware d'authentification
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
}

// ── Routes API ──────────────────────────────────────────────────

// Authentification
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    }

    // Vérifier que l'email n'est pas déjà utilisé
    const { rows: existingEmail } = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Générer un username unique depuis l'email
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
    let username = baseUsername;
    let suffix = 1;
    while (true) {
      const { rows: existing } = await pool.query('SELECT id FROM admins WHERE username = $1', [username]);
      if (existing.length === 0) break;
      username = `${baseUsername}_${suffix++}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows: newUser } = await pool.query(
      'INSERT INTO admins (name, email, username, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, role',
      [name, email, username, passwordHash]
    );
    const role = newUser[0].role || 'admin';

    const token = jwt.sign(
      { id: newUser[0].id, username, name, email, role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.json({ token, username, name, email, role });
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const { rows } = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const admin = rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, name: admin.name, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.json({ token, username: admin.username, name: admin.name, email: admin.email, role: admin.role });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/update', authenticateToken, async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    
    let query = 'UPDATE admins SET ';
    const params = [];
    let paramIndex = 1;
    const setClauses = [];
    
    if (name) { setClauses.push(`name = $${paramIndex++}`); params.push(name); }
    if (email) { setClauses.push(`email = $${paramIndex++}`); params.push(email); }
    if (username) { setClauses.push(`username = $${paramIndex++}`); params.push(username); }
    if (password) { 
        const passwordHash = await bcrypt.hash(password, 10);
        setClauses.push(`password_hash = $${paramIndex++}`); params.push(passwordHash); 
    }
    
    if (setClauses.length === 0) return res.json({ message: 'Rien à mettre à jour' });
    
    query += setClauses.join(', ');
    query += ` WHERE id = $${paramIndex}`;
    params.push(req.user.id);
    
    // Check if new email/username is already taken
    if (email || username) {
        let checkQuery = 'SELECT id FROM admins WHERE id != $1 AND (';
        const checkParams = [req.user.id];
        const conditions = [];
        if (email) { conditions.push(`email = $2`); checkParams.push(email); }
        if (username) { conditions.push(`username = $${checkParams.length + 1}`); checkParams.push(username); }
        checkQuery += conditions.join(' OR ') + ')';
        
        const { rows } = await pool.query(checkQuery, checkParams);
        if (rows.length > 0) return res.status(400).json({ error: 'Cet email ou identifiant est déjà utilisé' });
    }
    
    await pool.query(query, params);
    
    res.json({ message: 'Informations mises à jour' });
  } catch (error) {
    console.error('Erreur update auth:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Vérifier le token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Sessions
app.get('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'super_admin';
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Count query
    const countQueryStr = `
      SELECT COUNT(*) 
      FROM sessions s
      ${isAdmin ? '' : 'WHERE s.admin_id = $1'}
    `;
    const countParams = isAdmin ? [] : [req.user.id];
    const { rows: countRows } = await pool.query(countQueryStr, countParams);
    const total = parseInt(countRows[0].count);

    // Data query
    const queryStr = `
      SELECT s.*, a.username as admin_username 
      FROM sessions s
      LEFT JOIN admins a ON s.admin_id = a.id
      ${isAdmin ? '' : 'WHERE s.admin_id = $1'}
      ORDER BY s.created_at DESC
      LIMIT $${isAdmin ? '1' : '2'} OFFSET $${isAdmin ? '2' : '3'}
    `;
    const params = isAdmin ? [limit, offset] : [req.user.id, limit, offset];
    
    const { rows: sessions } = await pool.query(queryStr, params);

    // Récupérer les photos pour chaque session
    for (let session of sessions) {
      const { rows: photos } = await pool.query(
        'SELECT id, name, data_url, size, created_at FROM photos WHERE session_id = $1 ORDER BY created_at',
        [session.id]
      );
      session.photos = photos.map(p => ({
        id: p.id,
        name: p.name,
        dataUrl: p.data_url,
        size: p.size
      }));
    }

    res.json({
      data: sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur get sessions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/sessions/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const { rows: sessions } = await pool.query(
      'SELECT * FROM sessions WHERE code = $1',
      [code]
    );
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Séance introuvable' });
    }

    const session = sessions[0];
    
    // Vérifier l'expiration
    if (new Date(session.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Séance expirée' });
    }

    // Récupérer les photos
    const { rows: photos } = await pool.query(
      'SELECT id, name, data_url, size, created_at FROM photos WHERE session_id = $1 ORDER BY created_at',
      [session.id]
    );

    session.photos = photos.map(p => ({
      id: p.id,
      name: p.name,
      dataUrl: p.data_url,
      size: p.size
    }));

    res.json(session);
  } catch (error) {
    console.error('Erreur get session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const { clientName, type, note, expiryDays } = req.body;

    // Générer un code unique
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    let exists = true;
    
    while (exists) {
      code = Array.from({ length: 6 }, () => 
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
      
      const { rows: existing } = await pool.query(
        'SELECT id FROM sessions WHERE code = $1',
        [code]
      );
      exists = existing.length > 0;
    }

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiryDays || 30));

    const result = await pool.query(
      `INSERT INTO sessions (code, client_name, type, note, expires_at, admin_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [code, clientName, type, note || null, expiresAt, req.user.id]
    );

    res.json({ 
      id: result.rows[0].id, 
      code, 
      clientName, 
      type, 
      note, 
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      photos: [] 
    });
  } catch (error) {
    console.error('Erreur create session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/sessions/:code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const isAdmin = req.user.role === 'super_admin';
    
    let queryStr = 'DELETE FROM sessions WHERE code = $1';
    const params = [code];
    if (!isAdmin) {
      queryStr += ' AND admin_id = $2';
      params.push(req.user.id);
    }
    
    const result = await pool.query(queryStr, params);
    
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Accès refusé ou séance introuvable' });
    }
    
    res.json({ message: 'Séance supprimée' });
  } catch (error) {
    console.error('Erreur delete session:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Photos
app.post('/api/sessions/:code/photos', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const { photos } = req.body; // Array of { name, dataUrl, size }
    const isAdmin = req.user.role === 'super_admin';
    
    // Récupérer la session
    let queryStr = 'SELECT id FROM sessions WHERE code = $1';
    let params = [code];
    if (!isAdmin) {
      queryStr += ' AND admin_id = $2';
      params.push(req.user.id);
    }
    const { rows: sessions } = await pool.query(queryStr, params);
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Séance introuvable' });
    }

    const sessionId = sessions[0].id;

    // Insérer les photos
    const insertPromises = photos.map(photo => 
      pool.query(
        'INSERT INTO photos (session_id, name, data_url, size) VALUES ($1, $2, $3, $4)',
        [sessionId, photo.name, photo.dataUrl, photo.size || 0]
      )
    );

    await Promise.all(insertPromises);

    res.json({ message: `${photos.length} photo(s) ajoutée(s)` });
  } catch (error) {
    console.error('Erreur add photos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/sessions/:code/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const { code, photoId } = req.params;
    const isAdmin = req.user.role === 'super_admin';
    
    // Vérifier que la photo appartient à la session (syntaxe compatible PostgreSQL)
    let queryStr = `
      DELETE FROM photos 
      USING sessions 
      WHERE photos.session_id = sessions.id 
      AND sessions.code = $1 
      AND photos.id = $2
    `;
    const params = [code, photoId];
    if (!isAdmin) {
      queryStr += ' AND sessions.admin_id = $3';
      params.push(req.user.id);
    }
    await pool.query(queryStr, params);
    
    res.json({ message: 'Photo supprimée' });
  } catch (error) {
    console.error('Erreur delete photo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/sessions/:code/photos', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const isAdmin = req.user.role === 'super_admin';
    
    let queryStr = `
      DELETE FROM photos 
      USING sessions 
      WHERE photos.session_id = sessions.id 
      AND sessions.code = $1
    `;
    const params = [code];
    if (!isAdmin) {
      queryStr += ' AND sessions.admin_id = $2';
      params.push(req.user.id);
    }
    await pool.query(queryStr, params);
    
    res.json({ message: 'Toutes les photos supprimées' });
  } catch (error) {
    console.error('Erreur delete all photos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const { rows: sessionCount } = await pool.query('SELECT COUNT(*) as count FROM sessions WHERE admin_id = $1', [req.user.id]);
    const { rows: photoCount } = await pool.query(`
      SELECT COUNT(photos.id) as count 
      FROM photos 
      JOIN sessions ON photos.session_id = sessions.id 
      WHERE sessions.admin_id = $1
    `, [req.user.id]);
    const { rows: recentSession } = await pool.query(
      'SELECT * FROM sessions WHERE admin_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    
    res.json({
      totalSessions: parseInt(sessionCount[0].count, 10),
      totalPhotos: parseInt(photoCount[0].count, 10),
      recentSession: recentSession[0] || null
    });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Accès refusé. Réservé au Super Admin.' });
  }
  next();
}

app.get('/api/super/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.name, a.email, a.username, a.role, a.created_at,
             COUNT(DISTINCT s.id) as sessions_count,
             COUNT(p.id) as photos_count
      FROM admins a
      LEFT JOIN sessions s ON s.admin_id = a.id
      LEFT JOIN photos p ON p.session_id = s.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);
    res.json(rows.map(row => ({
      ...row,
      sessions_count: parseInt(row.sessions_count, 10) || 0,
      photos_count: parseInt(row.photos_count, 10) || 0
    })));
  } catch (error) {
    console.error('Erreur get super users:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/super/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: "Impossible de supprimer votre propre compte" });
    }
    const result = await pool.query('DELETE FROM admins WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json({ message: "Utilisateur et ses données supprimés" });
  } catch (error) {
    console.error('Erreur delete super user:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/super/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, username, password } = req.body;
    
    let query = 'UPDATE admins SET ';
    const params = [];
    let paramIndex = 1;
    const setClauses = [];
    
    if (name) { setClauses.push(`name = $${paramIndex++}`); params.push(name); }
    if (email) { setClauses.push(`email = $${paramIndex++}`); params.push(email); }
    if (username) { setClauses.push(`username = $${paramIndex++}`); params.push(username); }
    if (password) { 
        const passwordHash = await bcrypt.hash(password, 10);
        setClauses.push(`password_hash = $${paramIndex++}`); params.push(passwordHash); 
    }
    
    if (setClauses.length === 0) return res.json({ message: 'Rien à mettre à jour' });
    
    query += setClauses.join(', ');
    query += ` WHERE id = $${paramIndex}`;
    params.push(id);
    
    if (email || username) {
        let checkQuery = 'SELECT id FROM admins WHERE id != $1 AND (';
        const checkParams = [id];
        const conditions = [];
        if (email) { conditions.push(`email = $2`); checkParams.push(email); }
        if (username) { conditions.push(`username = $${checkParams.length + 1}`); checkParams.push(username); }
        checkQuery += conditions.join(' OR ') + ')';
        
        const { rows } = await pool.query(checkQuery, checkParams);
        if (rows.length > 0) return res.status(400).json({ error: 'Cet email ou identifiant est déjà utilisé' });
    }
    
    const result = await pool.query(query, params);
    if (result.rowCount === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    
    res.json({ message: 'Utilisateur mis à jour' });
  } catch (error) {
    console.error('Erreur update super user:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Démarrer le serveur
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
  });
}

startServer();
