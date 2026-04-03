const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));

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
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des séances
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(6) UNIQUE NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `);
    
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
        'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
        ['admin', defaultPassword]
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
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.json({ token, username: admin.username });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/update', authenticateToken, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    let query = 'UPDATE admins SET ';
    const params = [];
    let paramIndex = 1;
    
    if (username) {
      query += `username = $${paramIndex}`;
      params.push(username);
      paramIndex++;
    }
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      if (username) query += ', ';
      query += `password_hash = $${paramIndex}`;
      params.push(passwordHash);
      paramIndex++;
    }
    
    query += ` WHERE id = $${paramIndex}`;
    params.push(req.user.id);
    
    await pool.query(query, params);
    
    res.json({ message: 'Identifiants mis à jour' });
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
    const { rows: sessions } = await pool.query(`
      SELECT s.*
      FROM sessions s
      ORDER BY s.created_at DESC
    `);

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

    res.json(sessions);
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
      `INSERT INTO sessions (code, client_name, type, note, expires_at) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [code, clientName, type, note || null, expiresAt]
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
    
    await pool.query('DELETE FROM sessions WHERE code = $1', [code]);
    
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
    
    // Récupérer la session
    const { rows: sessions } = await pool.query(
      'SELECT id FROM sessions WHERE code = $1',
      [code]
    );
    
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
    
    // Vérifier que la photo appartient à la session (syntaxe compatible PostgreSQL)
    await pool.query(`
      DELETE FROM photos 
      USING sessions 
      WHERE photos.session_id = sessions.id 
      AND sessions.code = $1 
      AND photos.id = $2
    `, [code, photoId]);
    
    res.json({ message: 'Photo supprimée' });
  } catch (error) {
    console.error('Erreur delete photo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/sessions/:code/photos', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    
    await pool.query(`
      DELETE FROM photos 
      USING sessions 
      WHERE photos.session_id = sessions.id 
      AND sessions.code = $1
    `, [code]);
    
    res.json({ message: 'Toutes les photos supprimées' });
  } catch (error) {
    console.error('Erreur delete all photos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const { rows: sessionCount } = await pool.query('SELECT COUNT(*) as count FROM sessions');
    const { rows: photoCount } = await pool.query('SELECT COUNT(*) as count FROM photos');
    const { rows: recentSession } = await pool.query(
      'SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1'
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

// Démarrer le serveur
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
  });
}

startServer();
