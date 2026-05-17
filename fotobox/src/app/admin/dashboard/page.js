"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import Link from "next/link";
import {
  getSuperUsers, deleteUser, updateUser, getUserProfile,
  createSession, registerPhoto, deleteSession as deleteSessionAction,
  deletePhoto as deletePhotoAction, clearPhotos
} from "@/app/actions/admin";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/app/components/PageTransition";

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState("dashboard"); // dashboard, sessions, session-detail, settings, super
  const [currentSessionCode, setCurrentSessionCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Data states
  const [stats, setStats] = useState({ totalSessions: 0, totalPhotos: 0, recentSession: null });
  const [recentSessions, setRecentSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [sessionPhotos, setSessionPhotos] = useState([]);

  const [superUsers, setSuperUsers] = useState([]);
  const [userToEdit, setUserToEdit] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [newSessionCode, setNewSessionCode] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin/login");
        return;
      }

      let profile = null;
      try {
        profile = await getUserProfile(user.id);
      } catch (e) {
        console.error("Could not fetch profile via server action:", e);
      }

      // Merge user from auth and profile from DB
      // We also check role in app_metadata as a fallback/secondary source
      const userRole = profile?.role || user.app_metadata?.role || "admin";

      setCurrentUser({ ...user, ...profile, role: userRole });
      setLoading(false);
      loadDashboardData(user.id);
    };
    checkAuth();
  }, [router, supabase]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Code ${text} copié !`, "success");
    });
  };

  // --- Data Loaders ---
  const loadDashboardData = async (userId) => {
    const uid = userId || currentUser?.id;
    if (!uid) return;

    // Stats
    const { count: sessionCount } = await supabase.from("sessions").select("*", { count: "exact", head: true }).eq("admin_id", uid);

    // This is a naive photo count, in a real app you might use an RPC or join
    const { data: sessionsForPhotos } = await supabase.from("sessions").select("id").eq("admin_id", uid);
    let photoCount = 0;
    if (sessionsForPhotos && sessionsForPhotos.length > 0) {
      const sessionIds = sessionsForPhotos.map(s => s.id);
      const { count: pCount } = await supabase.from("photos").select("*", { count: "exact", head: true }).in("session_id", sessionIds);
      photoCount = pCount || 0;
    }

    const { data: recent } = await supabase.from("sessions").select("*").eq("admin_id", uid).order("created_at", { ascending: false }).limit(4);

    setStats({
      totalSessions: sessionCount || 0,
      totalPhotos: photoCount,
      recentSession: recent?.[0] || null
    });
    setRecentSessions(recent || []);
  };

  const loadAllSessions = async () => {
    const { data } = await supabase.from("sessions").select("*, photos(id)").eq("admin_id", currentUser.id).order("created_at", { ascending: false });
    setAllSessions(data || []);
  };

  const loadSessionDetail = async (code) => {
    const { data: session } = await supabase.from("sessions").select("*").eq("code", code).single();
    if (session) {
      setSessionDetail(session);
      const { data: photos } = await supabase.from("photos").select("*").eq("session_id", session.id).order("created_at", { ascending: true });
      setSessionPhotos(photos || []);
    }
  };

  // --- Actions ---
  const doLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    const clientName = e.target.clientName?.value?.trim();
    const type = e.target.sessionType?.value;
    const note = e.target.sessionNote?.value?.trim();
    const expDays = parseInt(e.target.sessionExpiry?.value) || 30;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expDays);

    try {
      const data = await createSession({
        code,
        client_name: clientName,
        type,
        note,
        expires_at: expiresAt.toISOString(),
        // admin_id est forcé côté serveur — ne pas l'envoyer depuis le client
      });

      setIsCreateModalOpen(false);
      setNewSessionCode(code);
      setIsCodeModalOpen(true);
      loadDashboardData();
    } catch (err) {
      console.error("Erreur création session:", err);
      showToast("Erreur de création : " + err.message, "error");
    }
  };

  const deleteSessionHandler = async (code) => {
    if (!confirm("Supprimer cette séance et toutes ses photos ?")) return;
    try {
      await deleteSessionAction(code);
      showToast("Séance supprimée.", "info");
      if (currentView === 'dashboard') loadDashboardData();
      else if (currentView === 'sessions') loadAllSessions();
    } catch (err) {
      showToast("Erreur lors de la suppression: " + err.message, "error");
    }
  };

  const removePhoto = async (photoId) => {
    if (!confirm("Supprimer cette photo ?")) return;
    try {
      await deletePhotoAction(photoId);
      showToast("Photo supprimée.", "info");
      loadSessionDetail(currentSessionCode);
    } catch (err) {
      showToast("Erreur lors de la suppression: " + err.message, "error");
    }
  };

  const clearAllPhotos = async () => {
    if (!confirm("Supprimer toutes les photos de cette séance ?")) return;
    try {
      await clearPhotos(sessionDetail.id);
      showToast("Toutes les photos ont été supprimées.", "info");
      loadSessionDetail(currentSessionCode);
    } catch (err) {
      showToast("Erreur lors de la suppression: " + err.message, "error");
    }
  };

  // --- Views Navigation ---
  const showDashboardTab = () => { setCurrentView("dashboard"); loadDashboardData(); };
  const showSessionsTab = () => { setCurrentView("sessions"); loadAllSessions(); };
  const showSettingsTab = () => setCurrentView("settings");

  const showSuperAdminTab = async () => {
    setCurrentView("super");
    try {
      const users = await getSuperUsers();
      setSuperUsers(users);
    } catch (e) {
      showToast("Erreur: " + e.message, "error");
    }
  };

  const openSessionDetail = (code) => {
    setCurrentSessionCode(code);
    setCurrentView("session-detail");
    loadSessionDetail(code);
  };

  if (loading) return <div style={{ background: "var(--dark-2)", minHeight: "100vh" }}></div>;

  return (
    <PageTransition>
    <div className="admin-layout" style={{ background: "var(--dark-2)", minHeight: "100vh" }}>
      <aside className="sidebar">
        <Link href="/" className="logo">
          <Image src="/images/logo.png" width={40} height={40} className="logo-img" alt="FotoBOX Logo" />
          <span className="dynamic-text">FotoBOX</span>
        </Link>
        <button className={`sidebar-item ${currentView === "dashboard" ? "active" : ""}`} onClick={showDashboardTab}>
          <span className="icon">📊</span> Tableau de bord
        </button>
        <button className={`sidebar-item ${currentView === "sessions" ? "active" : ""}`} onClick={showSessionsTab}>
          <span className="icon">📁</span> Séances
        </button>
        <div className="sidebar-divider"></div>
        <button className={`sidebar-item ${currentView === "settings" ? "active" : ""}`} onClick={showSettingsTab}>
          <span className="icon">⚙️</span> Paramètres
        </button>
        {currentUser?.role === "super_admin" && (
          <button className={`sidebar-item ${currentView === "super" ? "active" : ""}`} onClick={showSuperAdminTab}>
            <span className="icon">👑</span> Supervision
          </button>
        )}
        <Link href="/" className="sidebar-item" target="_blank">
          <span className="icon">🌐</span> Vue client
        </Link>
        <button className="sidebar-item logout" onClick={doLogout}>
          <span className="icon">🚪</span> Déconnexion
        </button>
      </aside>

      <main className="main-content">
        {currentView === "dashboard" && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Tableau de bord</h1>
                <p className="page-subtitle">Bienvenue, <strong style={{ color: "var(--gold)" }}>{currentUser?.name || currentUser?.username || 'Admin'}</strong> 👋.</p>
              </div>
              <motion.button
                className="btn-primary"
                onClick={() => setIsCreateModalOpen(true)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                ✦ Nouvelle séance
              </motion.button>
            </div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-label">Séances actives</div>
                <div className="stat-value">{stats.totalSessions}</div>
                <div className="stat-sub">au total</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Photos hébergées</div>
                <div className="stat-value">{stats.totalPhotos}</div>
                <div className="stat-sub">dans toutes les séances</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Dernière séance</div>
                <div className="stat-value" style={{ fontSize: "1.4rem" }}>
                  {stats.recentSession ? formatDate(stats.recentSession.created_at) : '—'}
                </div>
                <div className="stat-sub">{stats.recentSession?.client_name || ''}</div>
              </div>
            </div>
            <div className="section-title">🕒 Séances récentes</div>
            <div className="sessions-list">
              <AnimatePresence>
                {recentSessions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📂</div>
                    <div className="empty-title">Aucune séance pour l'instant</div>
                  </div>
                ) : (
                  recentSessions.map((s, i) => (
                    <motion.div
                      className="session-row"
                      key={s.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.35 }}
                    >
                      <div>
                        <div className="session-name">{s.client_name}</div>
                        <div className="session-meta">
                          {s.type} · Créée le {formatDate(s.created_at)} · Expire le {formatDate(s.expires_at)}
                        </div>
                      </div>
                      <div className="session-code-badge" onClick={() => copyText(s.code)} title="Copier le code">{s.code}</div>
                      <div className="session-actions">
                        <button className="btn-secondary" onClick={() => openSessionDetail(s.code)} style={{ fontSize: ".8rem", padding: "8px 14px" }}>📸 Gérer</button>
                        <button className="btn-danger" onClick={() => deleteSessionHandler(s.code)}>🗑</button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {currentView === "sessions" && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Toutes les séances</h1>
                <p className="page-subtitle">Gérez toutes vos séances et accès clients.</p>
              </div>
              <motion.button
                className="btn-primary"
                onClick={() => setIsCreateModalOpen(true)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                ✦ Nouvelle séance
              </motion.button>
            </div>
            <div className="sessions-list">
              <AnimatePresence>
                {allSessions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📂</div>
                    <div className="empty-title">Aucune séance pour l'instant</div>
                    <p className="empty-text">Créez votre première séance pour commencer.</p>
                  </div>
                ) : (
                  allSessions.map((s, i) => (
                    <motion.div
                      className="session-row"
                      key={s.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.35 }}
                    >
                      <div>
                        <div className="session-name">{s.client_name}</div>
                        <div className="session-meta">
                          {s.type} · Créée le {formatDate(s.created_at)} · Expire le {formatDate(s.expires_at)}
                        </div>
                      </div>
                      <div className="photo-count">📷 {s.photos?.length || 0} photo{(s.photos?.length || 0) !== 1 ? 's' : ''}</div>
                      <div className="session-code-badge" onClick={() => copyText(s.code)} title="Copier le code">{s.code}</div>
                      <div className="session-actions">
                        <button className="btn-secondary" onClick={() => openSessionDetail(s.code)} style={{ fontSize: ".8rem", padding: "8px 14px" }}>📸 Gérer</button>
                        <button className="btn-danger" onClick={() => deleteSessionHandler(s.code)}>🗑</button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {currentView === "session-detail" && sessionDetail && (
          <div className="session-detail active">
            <button className="back-btn" onClick={showDashboardTab}>← Retour au tableau de bord</button>
            <div className="session-detail-header">
              <div>
                <h2 className="page-title">{sessionDetail.client_name}</h2>
                <p className="page-subtitle">{sessionDetail.type} · {formatDate(sessionDetail.created_at)}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div className="session-code-display">
                  <span style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Code client :</span>
                  <span className="code-pill">{sessionDetail.code}</span>
                  <button className="btn-icon copy-code-btn" onClick={() => copyText(sessionDetail.code)} title="Copier">📋</button>
                </div>
                <motion.button
                  className="btn-primary"
                  onClick={() => setIsUploadModalOpen(true)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  ➕ Ajouter des photos
                </motion.button>
              </div>
            </div>

            <div>
              <div className="section-title">
                📷 Photos ({sessionPhotos.length})
                {sessionPhotos.length > 0 && (
                  <button className="btn-danger" style={{ marginLeft: "auto" }} onClick={clearAllPhotos}>🗑 Tout supprimer</button>
                )}
              </div>
              {sessionPhotos.length > 0 ? (
                <div className="photo-grid">
                  {sessionPhotos.map(p => (
                    <div className="photo-thumb" key={p.id}>
                      <img src={p.url} alt={p.name} loading="lazy" />
                      <div className="photo-thumb-overlay">
                        <span style={{ color: "white", fontSize: ".75rem", textAlign: "center", padding: "0 8px" }}>{p.name}</span>
                      </div>
                      <button className="thumb-remove" onClick={() => removePhoto(p.id)} title="Supprimer">✕</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📷</div>
                  <div className="empty-title">Aucune photo pour l'instant</div>
                  <p className="empty-text">Ajoutez des photos pour que le client puisse les récupérer.</p>
                </div>
              )}
            </div>

            <div style={{ marginTop: "32px", padding: "20px", borderRadius: "var(--radius-md)", background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.2)" }}>
              <p style={{ color: "var(--gold)", fontSize: ".85rem", fontWeight: 600, marginBottom: "6px" }}>✦ Lien d'accès client</p>
              <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>
                Le client peut accéder à ses photos via :
                <code style={{ color: "var(--text)", background: "var(--surface)", padding: "2px 8px", borderRadius: "4px", fontSize: ".8rem", marginLeft: "4px" }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/client/${sessionDetail.code}` : `/client/${sessionDetail.code}`}
                </code>
              </p>
            </div>
          </div>
        )}

        {currentView === "settings" && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Paramètres</h1>
                <p className="page-subtitle">Modifiez vos informations de profil.</p>
              </div>
            </div>
            <form style={{ maxWidth: "500px", padding: "24px", borderRadius: "var(--radius-lg)", background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.2)", display: "flex", flexDirection: "column", gap: "16px" }} onSubmit={async (e) => {
              e.preventDefault();
              const name = e.target.settingName.value;
              const { error } = await supabase.from('profiles').update({ name }).eq('id', currentUser.id);
              if (!error) showToast("Profil mis à jour");
            }}>
              <div className="form-group">
                <label className="form-label">Nom du studio</label>
                <input type="text" id="settingName" className="form-input" defaultValue={currentUser?.name || ""} />
              </div>
              <button type="submit" className="btn-primary" style={{ justifyContent: "center" }}>Enregistrer</button>
            </form>
          </div>
        )}

        {currentView === "super" && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Supervision (Super Admin)</h1>
                <p className="page-subtitle">Gérez les comptes utilisateurs de l'application et suivez l'activité globale.</p>
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-label">Utilisateurs inscrits</div>
                <div className="stat-value">{superUsers.length}</div>
                <div className="stat-sub">au total</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Séances totales</div>
                <div className="stat-value">{superUsers.reduce((a, u) => a + u.sessions_count, 0)}</div>
                <div className="stat-sub">tous comptes confondus</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Photos totales</div>
                <div className="stat-value">{superUsers.reduce((a, u) => a + u.photos_count, 0)}</div>
                <div className="stat-sub">hébergées</div>
              </div>
            </div>

            <div className="section-title">👥 Tous les utilisateurs</div>
            <div className="sessions-list" style={{ marginTop: "16px" }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", background: "var(--surface)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <thead style={{ background: "rgba(255,255,255,0.05)" }}>
                  <tr>
                    <th style={{ padding: "16px" }}>Utilisateur</th>
                    <th style={{ padding: "16px" }}>Contact</th>
                    <th style={{ padding: "16px" }}>Rôle</th>
                    <th style={{ padding: "16px" }}>Volume</th>
                    <th style={{ padding: "16px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {superUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "16px" }}>
                        <strong style={{ color: "var(--gold)" }}>{u.name || u.username}</strong><br />
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>@{u.username}</span>
                      </td>
                      <td style={{ padding: "16px" }}>{u.email || "—"}</td>
                      <td style={{ padding: "16px" }}>
                        <span className="code-pill" style={{ fontSize: "0.75rem", background: u.role === "super_admin" ? "#5b4a1b" : "", color: u.role === "super_admin" ? "#f5d78a" : "" }}>{u.role}</span>
                      </td>
                      <td style={{ padding: "16px", fontSize: "0.9rem" }}>
                        {u.sessions_count} séance(s)<br />
                        <span style={{ color: "var(--text-muted)" }}>{u.photos_count} photo(s)</span>
                      </td>
                      <td style={{ padding: "16px", textAlign: "right" }}>
                        {u.id !== currentUser.id ? (
                          <>
                            <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem", marginRight: "4px" }} onClick={() => setUserToEdit(u)}>✏️ Éditer</button>
                            <button className="btn-danger" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={async () => {
                              if (!confirm("Attention ! Êtes-vous sûr de vouloir supprimer cet utilisateur ?\\n\\nToutes ses séances et photos seront perdues !")) return;
                              try {
                                await deleteUser(u.id);
                                showToast("Utilisateur supprimé", "success");
                                showSuperAdminTab();
                              } catch (e) {
                                showToast("Erreur: " + e.message, "error");
                              }
                            }}>🗑</button>
                          </>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>(Vous)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            className="modal-overlay open"
            key="create-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal glass-card"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="modal-header">
                <h3 className="modal-title">Nouvelle Séance</h3>
                <button className="btn-icon" onClick={() => setIsCreateModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleCreateSession}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="form-group">
                    <label className="form-label">Nom du client *</label>
                    <input type="text" id="clientName" name="clientName" className="form-input" placeholder="ex: Marie Dupont" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type de séance</label>
                    <select id="sessionType" name="sessionType" className="form-input">
                      <option>Portrait</option><option>Famille</option><option>Mariage</option>
                      <option>Bébé / Grossesse</option><option>Professionnel</option>
                      <option>Mode / Beauté</option><option>Autre</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Note interne</label>
                    <input type="text" id="sessionNote" name="sessionNote" className="form-input" placeholder="optionnel" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Durée de validité (jours)</label>
                    <input type="number" id="sessionExpiry" name="sessionExpiry" className="form-input" defaultValue="30" min="1" max="365" />
                  </div>
                  <button type="submit" className="btn-primary" style={{ justifyContent: "center" }}>✨ Créer la séance & générer un code</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CODE MODAL */}
      <AnimatePresence>
        {isCodeModalOpen && (
          <motion.div className="modal-overlay open" key="code-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <motion.div className="modal glass-card" style={{ maxWidth: "440px", textAlign: "center" }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25, ease: "easeOut" }}>
              <div style={{ fontSize: "3rem", marginBottom: "8px" }}>🎉</div>
              <h3 className="modal-title" style={{ textAlign: "center" }}>Séance créée !</h3>
              <p style={{ color: "var(--text-muted)", fontSize: ".9rem" }}>Code d'accès client :</p>
              <div className="code-pill" style={{ margin: "16px auto", fontSize: "2rem", textAlign: "center", cursor: "pointer" }} onClick={() => copyText(newSessionCode)}>{newSessionCode}</div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px" }}>
                <button className="btn-secondary" onClick={() => { setIsCodeModalOpen(false); openSessionDetail(newSessionCode); setIsUploadModalOpen(true); }}>📸 Ajouter des photos</button>
                <button className="btn-primary" onClick={() => setIsCodeModalOpen(false)}>OK</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT USER MODAL */}
      <AnimatePresence>
        {userToEdit && (
          <motion.div className="modal-overlay open" key="edit-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <motion.div className="modal glass-card" style={{ maxWidth: "400px" }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25, ease: "easeOut" }}>
              <h3 style={{ marginBottom: "16px" }}>Modifier l'utilisateur</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await updateUser(userToEdit.id, {
                    name: e.target.editName.value,
                    email: e.target.editEmail.value,
                    username: e.target.editUsername.value,
                    password: e.target.editPassword.value || undefined
                  });
                  showToast("Utilisateur modifié avec succès", "success");
                  setUserToEdit(null);
                  showSuperAdminTab();
                } catch (err) {
                  showToast("Erreur: " + err.message, "error");
                }
              }}>
                <div className="form-group">
                  <label className="form-label">Nom complet</label>
                  <input type="text" name="editName" className="form-input" defaultValue={userToEdit.name} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom d'utilisateur</label>
                  <input type="text" name="editUsername" className="form-input" defaultValue={userToEdit.username} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" name="editEmail" className="form-input" defaultValue={userToEdit.email} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nouveau mot de passe (optionnel)</label>
                  <input type="password" name="editPassword" className="form-input" placeholder="••••••••" />
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button type="button" className="btn-secondary" onClick={() => setUserToEdit(null)}>Annuler</button>
                  <button type="submit" className="btn-primary">Enregistrer</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPLOAD MODAL */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div className="modal-overlay open" key="upload-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25, ease: "easeOut" }}>
              <UploadModal
                sessionCode={currentSessionCode}
                sessionId={sessionDetail?.id}
                onClose={() => { setIsUploadModalOpen(false); loadSessionDetail(currentSessionCode); }}
                supabase={supabase}
                showToast={showToast}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            className="toast-container"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className={`toast toast-${toast.type} show`}>{toast.msg}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </PageTransition>
  );
}

function compressImage(file, maxPx = 3000, quality = 0.88) {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx) {
        height = Math.round((height * maxPx) / width);
        width = maxPx;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" })),
        "image/webp",
        quality
      );
    };
    img.src = url;
  });
}

// Upload Modal Extracted
function UploadModal({ sessionCode, sessionId, onClose, supabase, showToast }) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [fileProgress, setFileProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  const addFiles = (newFiles) => {
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  const handleFileChange = (e) => { if (e.target.files) addFiles(e.target.files); };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileProgress(prev => { const n = { ...prev }; delete n[index]; return n; });
  };

  const setProgress = (i, status) =>
    setFileProgress(prev => ({ ...prev, [i]: status }));

  const uploadPhotos = async () => {
    if (files.length === 0) return;
    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(i, "compressing");
      setUploadStatus(`Compression ${i + 1}/${files.length}...`);
      const compressed = await compressImage(file);

      setProgress(i, "uploading");
      setUploadStatus(`Envoi ${i + 1}/${files.length}...`);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const filePath = `${sessionCode}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("photos").upload(filePath, compressed);

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(filePath);
        try {
          await registerPhoto({ session_id: sessionId, name: file.name, url: publicUrlData.publicUrl, size: compressed.size });
          setProgress(i, "done");
          successCount++;
        } catch (err) {
          setProgress(i, "error");
          console.error("Erreur enregistrement photo DB:", err);
        }
      } else {
        setProgress(i, "error");
        console.error("Erreur upload Storage:", uploadError);
      }
    }

    setUploading(false);
    setUploadStatus("");
    showToast(`${successCount} photo(s) ajoutée(s)`, "success");
    onClose();
  };

  const OVERLAY = {
    compressing: { bg: "rgba(201,168,76,0.55)", icon: "⏳", label: "Compression..." },
    uploading: { bg: "rgba(26,95,192,0.55)", icon: "⬆", label: "Envoi..." },
    done: { bg: "rgba(90,247,184,0.45)", icon: "✓", label: null },
    error: { bg: "rgba(255,107,138,0.45)", icon: "✕", label: null },
  };

  return (
    <div className="modal-overlay open">
      <div className="modal glass-card" style={{ maxWidth: "640px", width: "92%" }}>
        <div className="modal-header">
          <h3 className="modal-title">Ajouter des photos</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div
          className={`upload-zone ${dragActive ? "active" : ""}`}
          onDragEnter={handleDrag} onDragLeave={handleDrag}
          onDragOver={handleDrag} onDrop={handleDrop}
          onClick={() => document.getElementById("fileInput").click()}
          style={{
            border: `2px dashed ${dragActive ? "rgba(201,168,76,0.6)" : "rgba(255,255,255,0.15)"}`,
            borderRadius: "var(--radius-lg)", padding: files.length > 0 ? "20px" : "40px 20px",
            textAlign: "center",
            background: dragActive ? "rgba(201,168,76,0.05)" : "rgba(255,255,255,0.02)",
            transition: "all 0.3s ease", cursor: "pointer", marginBottom: "16px"
          }}
        >
          <input type="file" id="fileInput" multiple accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
          <div style={{ fontSize: files.length > 0 ? "1.6rem" : "3rem", marginBottom: "8px" }}>📸</div>
          <p style={{ fontWeight: 600, color: "var(--gold)", marginBottom: "4px", fontSize: files.length > 0 ? "0.85rem" : "1rem" }}>
            Cliquez ou faites glisser vos photos ici
          </p>
          {files.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>JPG, PNG ou WEBP acceptés</p>
          )}
        </div>

        {files.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "0.8rem", marginBottom: "10px", color: "var(--text-muted)" }}>
              {files.length} photo{files.length > 1 ? "s" : ""} sélectionnée{files.length > 1 ? "s" : ""}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
              gap: "10px",
              maxHeight: "260px", overflowY: "auto",
              paddingRight: "4px"
            }}>
              {files.map((file, i) => {
                const ov = OVERLAY[fileProgress[i]];
                return (
                  <div key={i} style={{
                    position: "relative", aspectRatio: "1",
                    borderRadius: "10px", overflow: "hidden",
                    background: "rgba(255,255,255,0.05)",
                    border: fileProgress[i] === "done"
                      ? "1px solid rgba(90,247,184,0.4)"
                      : fileProgress[i] === "error"
                        ? "1px solid rgba(255,107,138,0.4)"
                        : "1px solid rgba(255,255,255,0.08)"
                  }}>
                    {/* Aperçu */}
                    {previews[i] && (
                      <img src={previews[i]} alt={file.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    )}

                    {/* Overlay de progression */}
                    {ov && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: ov.bg, backdropFilter: "blur(2px)",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: "4px"
                      }}>
                        <span style={{ fontSize: "1.4rem" }}>{ov.icon}</span>
                        {ov.label && <span style={{ fontSize: "9px", color: "#fff", letterSpacing: "0.5px" }}>{ov.label}</span>}
                      </div>
                    )}

                    {/* Bouton supprimer */}
                    {!uploading && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        style={{
                          position: "absolute", top: 5, right: 5,
                          width: 22, height: 22, borderRadius: "50%",
                          background: "rgba(255,77,77,0.88)", border: "none",
                          color: "#fff", cursor: "pointer", fontSize: "14px", lineHeight: 1,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
                        }}
                      >×</button>
                    )}
                  </div>
                );
              })}
            </div>
            {uploading && (
              <div style={{ marginTop: "12px", height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <motion.div
                  style={{
                    height: "100%",
                    borderRadius: "2px",
                    background: "linear-gradient(90deg, var(--gold), rgba(201,168,76,0.5))",
                    transformOrigin: "left center",
                  }}
                  animate={{
                    scaleX: Object.values(fileProgress).filter(v => v === "done" || v === "error").length / Math.max(files.length, 1),
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button className="btn-secondary" onClick={onClose} disabled={uploading}>Annuler</button>
          <button className="btn-primary" onClick={uploadPhotos} disabled={uploading || files.length === 0}>
            {uploading ? uploadStatus || "Traitement..." : `✓ Enregistrer ${files.length} photos`}
          </button>
        </div>
      </div>
    </div>
  );
}

