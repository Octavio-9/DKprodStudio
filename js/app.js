/* ============================================================
   app.js — Shared utilities for Lumière Studio
   ============================================================ */

// ── Toast Notifications ──────────────────────────────────────
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const icons = { success: '✓', info: '✦', error: '⚠' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || '•'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── API helpers (remplace LocalStorage) ──────────────────────
// Les fonctions getSessions() et getSession() sont maintenant dans api.js
// Elles sont importées via le script api.js dans les pages HTML

// ── Code Generator ───────────────────────────────────────────
function generateCode(existingCodes = []) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (existingCodes.includes(code));
  return code;
}

// ── Format date ──────────────────────────────────────────────
function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Auth guard (for admin pages) ─────────────────────────────
async function requireAuth() {
  const token = localStorage.getItem('studioToken');
  if (!token) {
    window.location.href = 'admin-login.html';
    return false;
  }
  
  // Vérifier que le token est valide
  const auth = await verifyAuth();
  if (!auth.valid) {
    removeToken();
    window.location.href = 'admin-login.html';
    return false;
  }
  
  window.currentUser = auth.user;
  
  return true;
}
