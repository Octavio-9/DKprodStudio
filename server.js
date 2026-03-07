const express = require('express');
const mysql = require('mysql2/promise');
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

// Configuration MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'photo_studio',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Pool de connexions MySQL
let pool;

async function initDatabase() {
  try {
    // Connexion sans base de données pour créer la DB si elle n'existe pas
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempConnection.end();

    // Créer le pool avec la base de données
    pool = mysql.createPool(dbConfig);

    // Créer les tables
    await createTables();
    console.log('✅ Base de données initialisée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
}

async function createTables() {
  const connection = await pool.getConnection();
  
  try {
    // Table des administrateurs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des séances
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(6) UNIQUE NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        INDEX idx_code (code),
        INDEX idx_expires (expires_at)
      )
    `);

    // Table des photos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        data_url LONGTEXT NOT NULL,
        size INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        INDEX idx_session (session_id)
      )
    `);

    // Créer l'admin par défaut si aucun n'existe
    const [admins] = await connection.query('SELECT COUNT(*) as count FROM admins');
    if (admins[0].count === 0) {
      const defaultPassword = await bcrypt.hash('studio123', 10);
      await connection.query(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
        ['admin', defaultPassword]
      );
      console.log('✅ Admin par défaut créé (admin/studio123)');
    }
  } finally {
    connection.release();
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
    const connection = await pool.getConnection();
    
    const [rows] = await connection.query(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    );
    connection.release();

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
    const connection = await pool.getConnection();
    
    let query = 'UPDATE admins SET ';
    const params = [];
    
    if (username) {
      query += 'username = ?';
      params.push(username);
    }
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      if (username) query += ', ';
      query += 'password_hash = ?';
      params.push(passwordHash);
    }
    
    query += ' WHERE id = ?';
    params.push(req.user.id);
    
    await connection.query(query, params);
    connection.release();
    
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
    const connection = await pool.getConnection();
    const [sessions] = await connection.query(`
      SELECT s.*
      FROM sessions s
      ORDER BY s.created_at DESC
    `);

    // Récupérer les photos pour chaque session
    for (let session of sessions) {
      const [photos] = await connection.query(
        'SELECT id, name, data_url, size, created_at FROM photos WHERE session_id = ? ORDER BY created_at',
        [session.id]
      );
      session.photos = photos.map(p => ({
        id: p.id,
        name: p.name,
        dataUrl: p.data_url,
        size: p.size
      }));
    }
    connection.release();

    res.json(sessions);
  } catch (error) {
    console.error('Erreur get sessions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/sessions/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const connection = await pool.getConnection();
    
    const [sessions] = await connection.query(
      'SELECT * FROM sessions WHERE code = ?',
      [code]
    );
    
    if (sessions.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Séance introuvable' });
    }

    const session = sessions[0];
    
    // Vérifier l'expiration
    if (new Date(session.expires_at) < new Date()) {
      connection.release();
      return res.status(403).json({ error: 'Séance expirée' });
    }

    // Récupérer les photos
    const [photos] = await connection.query(
      'SELECT id, name, data_url, size, created_at FROM photos WHERE session_id = ? ORDER BY created_at',
      [session.id]
    );
    connection.release();

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
    const connection = await pool.getConnection();

    // Générer un code unique
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    let exists = true;
    
    while (exists) {
      code = Array.from({ length: 6 }, () => 
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
      
      const [existing] = await connection.query(
        'SELECT id FROM sessions WHERE code = ?',
        [code]
      );
      exists = existing.length > 0;
    }

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiryDays || 30));

    const [result] = await connection.query(
      `INSERT INTO sessions (code, client_name, type, note, expires_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [code, clientName, type, note || null, expiresAt]
    );
    connection.release();

    res.json({ 
      id: result.insertId, 
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
    const connection = await pool.getConnection();
    
    await connection.query('DELETE FROM sessions WHERE code = ?', [code]);
    connection.release();
    
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
    
    const connection = await pool.getConnection();
    
    // Récupérer la session
    const [sessions] = await connection.query(
      'SELECT id FROM sessions WHERE code = ?',
      [code]
    );
    
    if (sessions.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Séance introuvable' });
    }

    const sessionId = sessions[0].id;

    // Insérer les photos
    const insertPromises = photos.map(photo => 
      connection.query(
        'INSERT INTO photos (session_id, name, data_url, size) VALUES (?, ?, ?, ?)',
        [sessionId, photo.name, photo.dataUrl, photo.size || 0]
      )
    );

    await Promise.all(insertPromises);
    connection.release();

    res.json({ message: `${photos.length} photo(s) ajoutée(s)` });
  } catch (error) {
    console.error('Erreur add photos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/sessions/:code/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const { code, photoId } = req.params;
    const connection = await pool.getConnection();
    
    // Vérifier que la photo appartient à la session
    const [photos] = await connection.query(`
      DELETE p FROM photos p
      INNER JOIN sessions s ON p.session_id = s.id
      WHERE s.code = ? AND p.id = ?
    `, [code, photoId]);
    
    connection.release();
    res.json({ message: 'Photo supprimée' });
  } catch (error) {
    console.error('Erreur delete photo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/sessions/:code/photos', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const connection = await pool.getConnection();
    
    await connection.query(`
      DELETE p FROM photos p
      INNER JOIN sessions s ON p.session_id = s.id
      WHERE s.code = ?
    `, [code]);
    
    connection.release();
    res.json({ message: 'Toutes les photos supprimées' });
  } catch (error) {
    console.error('Erreur delete all photos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [sessionCount] = await connection.query('SELECT COUNT(*) as count FROM sessions');
    const [photoCount] = await connection.query('SELECT COUNT(*) as count FROM photos');
    const [recentSession] = await connection.query(
      'SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1'
    );
    
    connection.release();
    
    res.json({
      totalSessions: sessionCount[0].count,
      totalPhotos: photoCount[0].count,
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
