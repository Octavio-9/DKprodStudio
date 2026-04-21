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
        <button class="sidebar-item" id="navSettings" onclick="showSettingsTab()">
          <span class="icon">⚙️</span> Paramètres
        </button>
        ${window.currentUser?.role === 'super_admin' ? `
        <button class="sidebar-item" id="navSuper" onclick="showSuperAdminTab()">
          <span class="icon">👑</span> Supervision
        </button>
        ` : ''}
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
        <div id="sessionsView" style="display:none;"></div>
        <div id="settingsView" style="display:none;"></div>
        <div id="superView" style="display:none;"></div>
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
    const settingsBtn = document.getElementById('navSettings');
    const superBtn = document.getElementById('navSuper');
    if (dash) dash.classList.toggle('active', tab === 'dashboard');
    if (sessionsBtn) sessionsBtn.classList.toggle('active', tab === 'sessions');
    if (settingsBtn) settingsBtn.classList.toggle('active', tab === 'settings');
    if (superBtn) superBtn.classList.toggle('active', tab === 'super');
}

async function showDashboardTab() {
    setSidebarActive('dashboard');
    await showDashboard();
}

async function showSessionsTab() {
    setSidebarActive('sessions');
    await showSessions();
}

async function showSettingsTab() {
    setSidebarActive('settings');
    await showSettings();
}

async function showSuperAdminTab() {
    setSidebarActive('super');
    await showSuperAdmin();
}

async function showDashboard() {
    currentView = 'dashboard';
    currentSessionCode = null;
    
    const sessions = await getSessions();
    const totalPhotos = sessions.reduce((a, s) => a + (s.photos || []).length, 0);
    const recent = [...sessions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);

    document.getElementById('dashView').style.display = 'block';
    document.getElementById('sessionsView').style.display = 'none';
    document.getElementById('settingsView').style.display = 'none';
    const superV = document.getElementById('superView');
    if (superV) superV.style.display = 'none';
    document.getElementById('sessionDetailView').classList.remove('active');

    document.getElementById('dashView').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Tableau de bord</h1>
        <p class="page-subtitle">Bienvenue, <strong style="color:var(--gold);">${window.currentUser?.name || window.currentUser?.username || 'Admin'}</strong> 👋.</p>
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

    <!-- Recent Sessions -->
    <div class="section-title">🕒 Séances récentes</div>
    <div class="sessions-list">
      ${recent.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <div class="empty-title">Aucune séance pour l'instant</div>
        </div>
      ` : recent.map(s => renderSessionRow(s)).join('')}
    </div>
  `;
}

// ── Sessions View ──────────────────────────────────────────────
async function showSessions() {
    currentView = 'sessions';
    currentSessionCode = null;
    
    const sessions = await getSessions();

    document.getElementById('dashView').style.display = 'none';
    document.getElementById('sessionsView').style.display = 'block';
    document.getElementById('settingsView').style.display = 'none';
    const superV = document.getElementById('superView');
    if (superV) superV.style.display = 'none';
    document.getElementById('sessionDetailView').classList.remove('active');

    document.getElementById('sessionsView').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Toutes les séances</h1>
        <p class="page-subtitle">Gérez toutes vos séances et accès clients.</p>
      </div>
      <button class="btn-primary" onclick="openCreateModal()">
        ✦ Nouvelle séance
      </button>
    </div>

    <div class="sessions-list">
      ${sessions.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <div class="empty-title">Aucune séance pour l'instant</div>
          <p class="empty-text">Créez votre première séance pour commencer.</p>
        </div>
      ` : sessions.map(s => renderSessionRow(s)).join('')}
    </div>
  `;
}

function renderSessionRow(s) {
    return `
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
    document.getElementById('sessionsView').style.display = 'none';
    document.getElementById('settingsView').style.display = 'none';
    const superV = document.getElementById('superView');
    if (superV) superV.style.display = 'none';
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

// ── Cloudinary Upload ─────────────────────────────────────────
async function uploadToCloudinary(dataUrl) {
    const cloudName = 'dnpyeq0jm';
    const uploadPreset = 'Studio_Photo';
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append('file', dataUrl);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(url, {
        method: 'POST',
        body: formData
    });
    
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Erreur lors de l\'upload sur Cloudinary');
    }
    
    return await res.json();
}

async function confirmUpload() {
    const valid = pendingUploadFiles.filter(Boolean);
    if (!valid.length) { showToast('Aucune photo à enregistrer.', 'error'); return; }

    const btn = document.querySelector('#uploadModal .btn-primary');
    if (btn) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = 'Opération en cours...';
        btn.disabled = true;
    }

    try {
        const uploadedPhotos = [];
        for (let i = 0; i < valid.length; i++) {
            const p = valid[i];
            showToast(`Envoi au cloud... (${i+1}/${valid.length})`, 'info', 2000);
            const clData = await uploadToCloudinary(p.dataUrl);
            uploadedPhotos.push({
                name: p.name,
                dataUrl: clData.secure_url,
                size: clData.bytes || p.size
            });
        }

        showToast('Enregistrement final...', 'info', 2000);
        await addPhotos(currentSessionCode, uploadedPhotos);
        closeUploadModal();
        showToast(`${valid.length} photo${valid.length !== 1 ? 's' : ''} ajoutée${valid.length !== 1 ? 's' : ''} !`, 'success');

        if (currentView === 'session-detail') {
            const session = await getSession(currentSessionCode);
            if (session) renderSessionDetail(session);
        } else {
            await showDashboard();
        }
    } catch (error) {
        console.error(error);
        showToast('Erreur lors de l\'ajout des photos', 'error');
    } finally {
        if (btn && btn.dataset.originalText) {
            btn.innerHTML = btn.dataset.originalText;
            btn.disabled = false;
        }
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

// ── Settings View ───────────────────────────────────────────
async function showSettings() {
    currentView = 'settings';
    
    document.getElementById('dashView').style.display = 'none';
    document.getElementById('sessionsView').style.display = 'none';
    const superV = document.getElementById('superView');
    if (superV) superV.style.display = 'none';
    document.getElementById('sessionDetailView').classList.remove('active');
    
    const view = document.getElementById('settingsView');
    view.style.display = 'block';
    
    view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Paramètres</h1>
        <p class="page-subtitle">Modifiez vos informations de connexion et votre profil.</p>
      </div>
    </div>
    
    <form id="settingsForm" onsubmit="handleUpdateSettings(event)" style="max-width: 500px; padding: 24px; border-radius: var(--radius-lg); background: rgba(201,168,76,.06); border: 1px solid rgba(201,168,76,.2); display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
            <label class="form-label">Nom complet</label>
            <input type="text" id="settingName" class="form-input" value="${escHtml(window.currentUser?.name || '')}" placeholder="Ex: Studio DK">
        </div>
        <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="settingEmail" class="form-input" value="${escHtml(window.currentUser?.email || '')}" placeholder="contact@studio.com">
        </div>
        <div class="form-group">
            <label class="form-label">Identifiant de connexion</label>
            <input type="text" id="settingUsername" class="form-input" value="${escHtml(window.currentUser?.username || '')}" required>
        </div>
        <div style="margin: 10px 0; border-top: 1px dashed rgba(255,255,255,0.1);"></div>
        <div class="form-group">
            <label class="form-label">Nouveau mot de passe <span style="color:var(--text-muted);font-weight:normal;font-size:0.8rem;">(laisser vide pour ne pas modifier)</span></label>
            <input type="password" id="settingPassword" class="form-input" placeholder="••••••••">
        </div>
        
        <button type="submit" class="btn-primary" style="margin-top: 10px; justify-content: center;">
            Enregistrer les modifications
        </button>
    </form>
    `;
}

async function handleUpdateSettings(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const oldText = btn.innerHTML;
    btn.innerHTML = 'Enregistrement...';
    btn.disabled = true;

    try {
        const payload = {
            name: document.getElementById('settingName').value.trim(),
            email: document.getElementById('settingEmail').value.trim(),
            username: document.getElementById('settingUsername').value.trim()
        };
        const pass = document.getElementById('settingPassword').value;
        if (pass) payload.password = pass;

        await updateAuth(payload);
        
        // Mettre à jour l'utilisateur système
        const auth = await verifyAuth();
        if (auth.valid) window.currentUser = auth.user;

        showToast('Informations mises à jour avec succès', 'success');
        document.getElementById('settingPassword').value = '';
    } catch (error) {
        showToast(error.message || 'Erreur lors de la mise à jour', 'error');
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}

// ── Logout ───────────────────────────────────────────────────
function doLogout() {
    removeToken();
    window.location.href = 'admin-login.html';
}

// ── Super Admin View ──────────────────────────────────────────
async function showSuperAdmin() {
    if (window.currentUser?.role !== 'super_admin') {
        showToast('Accès refusé', 'error');
        return showDashboardTab();
    }
    
    currentView = 'super';
    document.getElementById('dashView').style.display = 'none';
    document.getElementById('sessionsView').style.display = 'none';
    document.getElementById('settingsView').style.display = 'none';
    document.getElementById('sessionDetailView').classList.remove('active');
    
    const view = document.getElementById('superView');
    view.style.display = 'block';
    
    const users = await getSuperUsers();
    const totalSess = users.reduce((a, u) => a + u.sessions_count, 0);
    const totalPhotos = users.reduce((a, u) => a + u.photos_count, 0);
    
    view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Supervision (Super Admin)</h1>
        <p class="page-subtitle">Gérez les comptes utilisateurs de l'application et suivez l'activité globale.</p>
      </div>
    </div>
    
    <!-- Stats Globales -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Utilisateurs inscrits</div>
        <div class="stat-value">${users.length}</div>
        <div class="stat-sub">au total</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Séances totales</div>
        <div class="stat-value">${totalSess}</div>
        <div class="stat-sub">tous comptes confondus</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Photos totales</div>
        <div class="stat-value">${totalPhotos}</div>
        <div class="stat-sub">hébergées sur Cloudinary</div>
      </div>
    </div>
    
    <div class="section-title">👥 Tous les utilisateurs</div>
    <div class="sessions-list" style="margin-top: 16px;">
        <table style="width: 100%; text-align: left; border-collapse: collapse; background: var(--surface); border-radius: var(--radius-lg); overflow: hidden;">
            <thead style="background: rgba(255,255,255,0.05);">
                <tr>
                    <th style="padding: 16px;">Utilisateur</th>
                    <th style="padding: 16px;">Contact</th>
                    <th style="padding: 16px;">Rôle</th>
                    <th style="padding: 16px;">Volume</th>
                    <th style="padding: 16px; text-align: right;">Action</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 16px;">
                        <strong style="color:var(--gold);">${escHtml(u.name || u.username)}</strong><br>
                        <span style="font-size:0.8rem;color:var(--text-muted);">@${escHtml(u.username)}</span>
                    </td>
                    <td style="padding: 16px;">${escHtml(u.email || '—')}</td>
                    <td style="padding: 16px;">
                        <span class="code-pill" style="font-size:0.75rem; ${u.role === 'super_admin' ? 'background: #5b4a1b; color: #f5d78a;' : ''}">
                            ${u.role}
                        </span>
                    </td>
                    <td style="padding: 16px; font-size: 0.9rem;">
                        ${u.sessions_count} séance(s)<br>
                        <span style="color:var(--text-muted);">${u.photos_count} photo(s)</span>
                    </td>
                    <td style="padding: 16px; text-align: right;">
                        ${u.id !== window.currentUser.id ? `
                            <button class="btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="handleDeleteUser(${u.id})">
                                🗑 Supprimer
                            </button>
                        ` : '<span style="color:var(--text-muted); font-size:0.85rem;">(Vous)</span>'}
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `;
}

async function handleDeleteUser(id) {
    if (!confirm('Attention ! Êtes-vous sûr de vouloir supprimer cet utilisateur ?\\n\\nToutes ses séances et les accès de ses clients seront irrémédiablement perdus !')) return;
    try {
        await deleteUser(id);
        showToast('Utilisateur supprimé', 'success');
        showSuperAdmin(); // Rafraichir
    } catch (error) {
        showToast('Erreur: ' + error.message, 'error');
    }
}

// ── HTML escape ──────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
