/* ============================================================
   api.js — API Client pour Photo Studio
   ============================================================ */

const API_BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:3000/api'
  : 'https://dkprodstudio-2.onrender.com/api';

// ── Gestion du token JWT ────────────────────────────────────
function getToken() {
  return localStorage.getItem('studioToken');
}

function setToken(token) {
  localStorage.setItem('studioToken', token);
}

function removeToken() {
  localStorage.removeItem('studioToken');
}

// ── Requêtes API ───────────────────────────────────────────
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur API');
    }

    return data;
  } catch (error) {
    console.error('Erreur API:', error);
    throw error;
  }
}

// ── Authentification ────────────────────────────────────────
async function login(username, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  if (data.token) {
    setToken(data.token);
  }

  return data;
}

async function register(name, email, password) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });

  if (data.token) {
    setToken(data.token);
  }

  return data;
}

async function updateAuth(data) {
  return await apiRequest('/auth/update', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function verifyAuth() {
  try {
    return await apiRequest('/auth/verify');
  } catch (error) {
    return { valid: false };
  }
}

// ── Sessions ────────────────────────────────────────────────
async function getSessions() {
  try {
    return await apiRequest('/sessions');
  } catch (error) {
    console.error('Erreur getSessions:', error);
    return [];
  }
}

async function getSession(code) {
  try {
    return await apiRequest(`/sessions/${code}`);
  } catch (error) {
    console.error('Erreur getSession:', error);
    return null;
  }
}

async function createSession(sessionData) {
  return await apiRequest('/sessions', {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });
}

async function deleteSession(code) {
  return await apiRequest(`/sessions/${code}`, {
    method: 'DELETE'
  });
}

// ── Photos ──────────────────────────────────────────────────
async function addPhotos(code, photos) {
  return await apiRequest(`/sessions/${code}/photos`, {
    method: 'POST',
    body: JSON.stringify({ photos })
  });
}

async function deletePhoto(code, photoId) {
  return await apiRequest(`/sessions/${code}/photos/${photoId}`, {
    method: 'DELETE'
  });
}

async function deleteAllPhotos(code) {
  return await apiRequest(`/sessions/${code}/photos`, {
    method: 'DELETE'
  });
}

// ── Statistiques ────────────────────────────────────────────
async function getStats() {
  try {
    return await apiRequest('/stats');
  } catch (error) {
    console.error('Erreur getStats:', error);
    return { totalSessions: 0, totalPhotos: 0, recentSession: null };
  }
}

// ── Super Admin ─────────────────────────────────────────────
async function getSuperUsers() {
  try {
    return await apiRequest('/super/users');
  } catch (error) {
    console.error('Erreur getSuperUsers:', error);
    return [];
  }
}

async function deleteUser(id) {
  return await apiRequest(`/super/users/${id}`, {
    method: 'DELETE'
  });
}
