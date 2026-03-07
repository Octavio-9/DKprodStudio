/* ============================================================
   admin.js — Admin Dashboard Logic
   ============================================================ */

// Auth guard (async)
let authChecked = false;
document.addEventListener('DOMContentLoaded', async () => {
    if (!authChecked) {
        const isAuth = await requireAuth();
        if (!isAuth) return; // redirect already happened
        authChecked = true;
        renderLayout();
    }
});

// State
let currentView = 'dashboard'; // 'dashboard' | 'session-detail'
let currentSessionCode = null;
let pendingUploadFiles = []; // { name, dataUrl } for current upload batch
let newSessionCode = null;   // code just created, for code modal flow

// ── Initial Render ────────────────────────────────────────────
// (moved to DOMContentLoaded above)

function renderLayout() {
    document.getElementById('appRoot').innerHTML = `
    <div class="admin-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="logo">
          <div class="logo-icon">✦</div>
          <span>DKprodStudio</span>
        </div>
        <button class="sidebar-item active" id="navDashboard" onclick="showDashboardTab()">
          <span class="icon">📊</span> Tableau de bord
        </button>
        <button class="sidebar-item" id="navSessions" onclick="showSessionsTab()">
          <span class="icon">📁</span> Séances
        </button>
        <div class="sidebar-divider"></div>
        <button class="sidebar-item" onclick="openSettings()">
          <span class="icon">⚙️</span> Paramètres
        </button>
        <a href="index.html" class="sidebar-item" target="_blank">
          <span class="icon">🌐</span> Vue client
        </a>
        <button class="sidebar-item logout" onclick="doLogout()">
          <span class="icon">🚪</span> Déconnexion
        </button>
      </aside>

      <!-- Main -->
      <main class="main-content" id="mainContent">
        <div id="dashView"></div>
        <div id="sessionDetailView" class="session-detail"></div>
      </main>
    </div>
  `;
    showDashboardTab();
}

// ── Sidebar active state ───────────────────────────────────────
function setSidebarActive(tab) {
    const dash = document.getElementById('navDashboard');
    const sessionsBtn = document.getElementById('navSessions');
    if (!dash || !sessionsBtn) return;
    dash.classList.toggle('active', tab === 'dashboard');
    sessionsBtn.classList.toggle('active', tab === 'sessions');
}

async function showDashboardTab() {
    setSidebarActive('dashboard');
    await showDashboard();
}

async function showSessionsTab() {
    setSidebarActive('sessions');
    await showDashboard();
}

// ── Dashboard ─────────────────────────────────────────────────
async function showDashboard() {
    currentView = 'dashboard';
    currentSessionCode = null;
    
    // Charger les sessions depuis l'API
    const sessions = await getSessions();
    const totalPhotos = sessions.reduce((a, s) => a + (s.photos || []).length, 0);
    const recent = [...sessions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);

    document.getElementById('dashView').style.display = 'block';
    document.getElementById('sessionDetailView').classList.remove('active');

    document.getElementById('dashView').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Tableau de bord</h1>
        <p class="page-subtitle">Gérez les séances photo et les accès clients</p>
      </div>
      <button class="btn-primary" onclick="openCreateModal()">
        ✦ Nouvelle séance
      </button>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Séances actives</div>
        <div class="stat-value">${sessions.length}</div>
        <div class="stat-sub">au total</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Photos hébergées</div>
        <div class="stat-value">${totalPhotos}</div>
        <div class="stat-sub">dans toutes les séances</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Dernière séance</div>
        <div class="stat-value" style="font-size:1.4rem;">${sessions.length ? formatDate(sessions[sessions.length - 1].created_at) : '—'}</div>
        <div class="stat-sub">${sessions.length ? (sessions[sessions.length - 1].client_name || '—') : ''}</div>
      </div>
    </div>

    <!-- Sessions List -->
    <div class="section-title">📁 Toutes les séances</div>
    <div class="sessions-list">
      ${sessions.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <div class="empty-title">Aucune séance pour l'instant</div>
          <p class="empty-text">Créez votre première séance pour commencer.</p>
        </div>
      ` : sessions.map(s => `
        <div class="session-row" id="row-${s.code}">
          <div>
            <div class="session-name">${escHtml(s.client_name)}</div>
            <div class="session-meta">
              ${escHtml(s.type)} · Créée le ${formatDate(s.created_at)} · 
              Expire le ${formatDate(s.expires_at)}
              ${s.note ? `· <em>${escHtml(s.note)}</em>` : ''}
            </div>
          </div>
          <div class="photo-count">📷 ${(s.photos || []).length} photo${(s.photos || []).length !== 1 ? 's' : ''}</div>
          <div class="session-code-badge" onclick="copyText('${s.code}')" title="Copier le code">${s.code}</div>
          <div class="session-actions">
            <button class="btn-secondary" onclick="openSessionDetail('${s.code}')" title="Gérer les photos" style="font-size:.8rem;padding:8px 14px;">
              📸 Gérer
            </button>
            <button class="btn-danger" onclick="deleteSessionHandler('${s.code}')" title="Supprimer">🗑</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ── Session Detail ────────────────────────────────────────────
async function openSessionDetail(code) {
    currentSessionCode = code;
    currentView = 'session-detail';
    const session = await getSession(code);
    if (!session) {
        showToast('Séance introuvable', 'error');
        return;
    }

    document.getElementById('dashView').style.display = 'none';
    const detail = document.getElementById('sessionDetailView');
    detail.classList.add('active');
    renderSessionDetail(session);
}

function renderSessionDetail(session) {
    const detail = document.getElementById('sessionDetailView');
    detail.innerHTML = `
    <button class="back-btn" onclick="showDashboardTab()">
      ← Retour au tableau de bord
    </button>
    <div class="session-detail-header">
      <div>
        <h2 class="page-title">${escHtml(session.client_name)}</h2>
        <p class="page-subtitle">${escHtml(session.type)} · ${formatDate(session.created_at)}</p>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div class="session-code-display">
          <span style="color:var(--text-muted);font-size:.85rem;">Code client :</span>
          <span class="code-pill">${session.code}</span>
          <button class="btn-icon copy-code-btn" onclick="copyText('${session.code}')" title="Copier">📋</button>
        </div>
        <button class="btn-primary" onclick="openUploadModal('${session.code}')">
          ➕ Ajouter des photos
        </button>
      </div>
    </div>

    <div>
      <div class="section-title">
        📷 Photos (${(session.photos || []).length})
        ${session.photos && session.photos.length > 0 ? `
          <button class="btn-danger" style="margin-left:auto;" onclick="clearAllPhotos('${session.code}')">
            🗑 Tout supprimer
          </button>` : ''}
      </div>

      ${session.photos && session.photos.length > 0 ? `
        <div class="photo-grid" id="adminPhotoGrid-${session.code}">
          ${session.photos.map((p, i) => `
            <div class="photo-thumb" id="thumb-${i}">
              <img src="${p.dataUrl}" alt="${escHtml(p.name)}" loading="lazy"/>
              <div class="photo-thumb-overlay">
                <span style="color:white;font-size:.75rem;text-align:center;padding:0 8px;">${escHtml(p.name)}</span>
              </div>
              <button class="thumb-remove" onclick="removePhoto('${session.code}', ${p.id || i})" title="Supprimer">✕</button>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">📷</div>
          <div class="empty-title">Aucune photo pour l'instant</div>
          <p class="empty-text">Ajoutez des photos pour que le client puisse les récupérer.</p>
        </div>
      `}
    </div>

    <div style="margin-top:32px;padding:20px;border-radius:var(--radius-md);background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);">
      <p style="color:var(--gold);font-size:.85rem;font-weight:600;margin-bottom:6px;">✦ Lien d'accès client</p>
      <p style="color:var(--text-muted);font-size:.85rem;">
        Le client peut accéder à ses photos via :
        <code style="color:var(--text);background:var(--surface);padding:2px 8px;border-radius:4px;font-size:.8rem;">
          client.html?code=${session.code}
        </code>
        ou en saisissant le code <strong style="color:var(--gold);">${session.code}</strong> sur la page d'accueil.
      </p>
    </div>
  `;
}

// ── Remove a single photo from a session ─────────────────────
async function removePhoto(code, photoId) {
    if (!confirm('Supprimer cette photo ?')) return;
    try {
        await deletePhoto(code, photoId);
        showToast('Photo supprimée.', 'info');
        const session = await getSession(code);
        if (session) renderSessionDetail(session);
    } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
    }
}

async function clearAllPhotos(code) {
    if (!confirm('Supprimer toutes les photos de cette séance ?')) return;
    try {
        await deleteAllPhotos(code);
        showToast('Toutes les photos ont été supprimées.', 'info');
        const session = await getSession(code);
        if (session) renderSessionDetail(session);
    } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ── Delete session ────────────────────────────────────────────
async function deleteSessionHandler(code) {
    if (!confirm('Supprimer cette séance et toutes ses photos ?')) return;
    try {
        await deleteSession(code);
        showToast('Séance supprimée.', 'info');
        await showDashboard();
    } catch (error) {
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ── Create Session Modal ──────────────────────────────────────
function openCreateModal() {
    document.getElementById('createModal').classList.add('open');
    document.getElementById('clientName').focus();
}
function closeModal() {
    document.getElementById('createModal').classList.remove('open');
    document.getElementById('createForm').reset();
}

async function handleCreateSession(e) {
    e.preventDefault();
    const clientName = document.getElementById('clientName').value.trim();
    const type = document.getElementById('sessionType').value;
    const note = document.getElementById('sessionNote').value.trim();
    const expDays = parseInt(document.getElementById('sessionExpiry').value) || 30;

    try {
        const session = await createSession({
            clientName,
            type,
            note,
            expiryDays: expDays
        });

        closeModal();
        newSessionCode = session.code;
        document.getElementById('revealedCode').textContent = session.code;
        document.getElementById('codeModal').classList.add('open');
        await showDashboard();
    } catch (error) {
        showToast('Erreur lors de la création de la séance', 'error');
    }
}

function copyCode() {
    if (newSessionCode) copyText(newSessionCode);
}

function goToSession() {
    document.getElementById('codeModal').classList.remove('open');
    if (newSessionCode) openUploadModal(newSessionCode);
}

// ── Upload Modal ──────────────────────────────────────────────
async function openUploadModal(code) {
    currentSessionCode = code;
    pendingUploadFiles = [];
    document.getElementById('uploadPreview').innerHTML = '';
    document.getElementById('uploadCount').textContent = '';
    document.getElementById('uploadModal').classList.add('open');
    const s = await getSession(code);
    if (s) document.getElementById('uploadModalTitle').textContent = `Ajouter des photos – ${s.client_name}`;
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('open');
    document.getElementById('fileInput').value = '';
    pendingUploadFiles = [];
}

function handleDragOver(e) { e.preventDefault(); document.getElementById('dropZone').classList.add('dragover'); }
function handleDragLeave() { document.getElementById('dropZone').classList.remove('dragover'); }
function handleDrop(e) {
    e.preventDefault();
    document.getElementById('dropZone').classList.remove('dragover');
    loadFiles(Array.from(e.dataTransfer.files));
}
function handleFileSelect(e) { loadFiles(Array.from(e.target.files)); }

// Compress image to max 1200px JPEG 82% quality via canvas
function compressImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const MAX = 1200;
            let w = img.width, h = img.height;
            if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

function loadFiles(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) { showToast('Aucune image valide sélectionnée.', 'error'); return; }

    imageFiles.forEach(async file => {
        if (file.size > 20 * 1024 * 1024) { showToast(`${file.name} est trop volumineux (max 20 Mo).`, 'error'); return; }
        const dataUrl = await compressImage(file);
        if (!dataUrl) { showToast(`Impossible de lire ${file.name}.`, 'error'); return; }
        const entry = { name: file.name, dataUrl, size: file.size };
        pendingUploadFiles.push(entry);
        addPreviewThumb(entry, pendingUploadFiles.length - 1);
        updateUploadCount();
    });
}

function addPreviewThumb(entry, idx) {
    const grid = document.getElementById('uploadPreview');
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    div.id = `prev-${idx}`;
    div.innerHTML = `
    <img src="${entry.dataUrl}" alt="${escHtml(entry.name)}" loading="lazy"/>
    <button class="thumb-remove" style="opacity:1;" onclick="removePendingFile(${idx})">✕</button>
  `;
    grid.appendChild(div);
}

function removePendingFile(idx) {
    pendingUploadFiles[idx] = null;
    const el = document.getElementById(`prev-${idx}`);
    if (el) { el.style.animation = 'toastOut .2s ease forwards'; setTimeout(() => el.remove(), 200); }
    updateUploadCount();
}

function updateUploadCount() {
    const count = pendingUploadFiles.filter(Boolean).length;
    document.getElementById('uploadCount').textContent = count ? `${count} photo${count !== 1 ? 's' : ''} prête${count !== 1 ? 's' : ''}` : '';
}

async function confirmUpload() {
    const valid = pendingUploadFiles.filter(Boolean);
    if (!valid.length) { showToast('Aucune photo à enregistrer.', 'error'); return; }

    try {
        await addPhotos(currentSessionCode, valid);
        closeUploadModal();
        showToast(`${valid.length} photo${valid.length !== 1 ? 's' : ''} ajoutée${valid.length !== 1 ? 's' : ''} !`, 'success');

        if (currentView === 'session-detail') {
            const session = await getSession(currentSessionCode);
            if (session) renderSessionDetail(session);
        } else {
            await showDashboard();
        }
    } catch (error) {
        showToast('Erreur lors de l\'ajout des photos', 'error');
    }
}

// ── Copy text to clipboard ───────────────────────────────────
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`Code ${text} copié !`, 'success');
    }).catch(() => {
        showToast('Copie impossible. Code : ' + text, 'info');
    });
}

// ── Settings modal (simple) ──────────────────────────────────
async function openSettings() {
    const newUser = prompt('Nouvel identifiant :', 'admin');
    if (newUser === null) return;
    const newPass = prompt('Nouveau mot de passe :');
    if (newPass === null || !newPass) return;
    
    try {
        await updateAuth(newUser.trim(), newPass);
        showToast('Identifiants mis à jour !', 'success');
    } catch (error) {
        showToast('Erreur lors de la mise à jour', 'error');
    }
}

// ── Logout ───────────────────────────────────────────────────
function doLogout() {
    removeToken();
    window.location.href = 'admin-login.html';
}

// ── HTML escape ──────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
