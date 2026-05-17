"use client";

import { useState, useEffect } from "react";

export default function ClientGallery({ session, initialPhotos }) {
  const [viewMode, setViewMode] = useState("grid");
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const [toast, setToast] = useState(null);

  const photos = initialPhotos || [];

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const toggleSelect = (idx) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setSelectedIndices(newSet);
  };

  const selectAll = () => {
    if (selectedIndices.size === photos.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(photos.map((_, i) => i)));
    }
  };

  const galleryItemClick = (e, idx) => {
    const check = e.target.closest('.item-check');
    if (check || viewMode === 'list') {
      toggleSelect(idx);
      return;
    }
    setLbIndex(idx);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  };

  const lbPrev = () => setLbIndex((lbIndex - 1 + photos.length) % photos.length);
  const lbNext = () => setLbIndex((lbIndex + 1) % photos.length);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;
      if (e.key === 'ArrowLeft') lbPrev();
      if (e.key === 'ArrowRight') lbNext();
      if (e.key === 'Escape') closeLightbox();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lbIndex]);

  // Transforme l'URL Supabase Storage pour forcer le téléchargement si nécessaire (Supabase le gère via "download")
  const downloadPhoto = async (url, name) => {
    try {
      showToast('Téléchargement en cours...', 'info');
      
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name || 'photo.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      showToast('Photo téléchargée !', 'success');
    } catch (err) {
      console.warn('Fetch impossible, ouverture directe:', err);
      window.open(url, '_blank');
      showToast('Appuyez longuement sur l\'image pour l\'enregistrer.', 'info');
    }
  };

  const downloadSelected = async () => {
    if (!selectedIndices.size) return;
    const selected = [...selectedIndices].sort();
    showToast(`Téléchargement de ${selected.length} photo${selected.length !== 1 ? 's' : ''} en cours...`, 'success');
    for (const idx of selected) {
      if (!photos[idx]) continue;
      await downloadPhoto(photos[idx].url, photos[idx].name);
      await new Promise(r => setTimeout(r, 400));
    }
  };

  return (
    <>
      <div className="client-hero">
        <div className="hero-badge" style={{ marginBottom: "16px" }}>✦ {session.type}</div>
        <h1>Bonjour, <span className="session-name-display">{session.client_name}</span>&nbsp;!</h1>
        <p>Vos photos de séance sont prêtes. Cliquez pour agrandir, sélectionnez pour télécharger.</p>
        <div className="client-meta">
          <span className="client-meta-badge">📅 {formatDate(session.created_at)}</span>
          <span className="client-meta-badge">📷 {photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
          <span className="client-meta-badge">🔑 {session.code}</span>
          {session.expires_at && (
            <span className="client-meta-badge" style={{ borderColor: "rgba(201,168,76,.3)", color: "var(--gold)" }}>
              ⏳ Expire le {formatDate(session.expires_at)}
            </span>
          )}
        </div>
      </div>

      <div className="client-toolbar">
        <div className="toolbar-left">
          <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grille">⊞ Grille</button>
          <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Liste">☰ Liste</button>
        </div>
        <div className="toolbar-right">
          <span className="selected-count" id="selectedCount">{photos.length > 0 ? `${selectedIndices.size} sélectionnée(s)` : ''}</span>
          {photos.length > 0 && (
            <>
              <button className="btn-secondary" onClick={selectAll} id="selectAllBtn">
                {selectedIndices.size === photos.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
              <button 
                className="btn-primary" 
                onClick={downloadSelected} 
                style={{ opacity: selectedIndices.size > 0 ? 1 : 0.5, pointerEvents: selectedIndices.size > 0 ? "auto" : "none", fontSize: ".9rem" }} 
                title="Téléchargez les photos sélectionnées"
              >
                ⬇ Télécharger la sélection
              </button>
            </>
          )}
        </div>
      </div>

      <div className="client-gallery">
        {photos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <div className="empty-title">Photos en cours de traitement</div>
            <p className="empty-text">Le studio prépare vos photos. Revenez dans quelques instants !</p>
          </div>
        ) : (
          <div className={`gallery-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {photos.map((p, i) => (
              <div key={p.id} className={`gallery-item ${selectedIndices.has(i) ? 'selected' : ''}`} onClick={(e) => galleryItemClick(e, i)}>
                <img src={p.url} alt={p.name} loading="lazy" />
                <div className="item-check">{selectedIndices.has(i) ? '✓' : ''}</div>
                <div className="item-overlay">
                  <span className="item-name">{p.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div className="lightbox open" onClick={(e) => { if(e.target.classList.contains('lightbox')) closeLightbox(); }}>
          <div className="lightbox-inner">
            <div className="lightbox-nav">
              <button className="lb-btn" onClick={(e) => { e.stopPropagation(); lbPrev(); }} title="Précédente">&#8592;</button>
              <button className="lb-btn" onClick={(e) => { e.stopPropagation(); lbNext(); }} title="Suivante">&#8594;</button>
            </div>
            <button className="lb-btn lightbox-close" onClick={closeLightbox} title="Fermer">✕</button>
            <img src={photos[lbIndex]?.url} alt="Aperçu" />
            <div className="lightbox-actions">
              <button className="btn-primary" onClick={(e) => { e.stopPropagation(); downloadPhoto(photos[lbIndex].url, photos[lbIndex].name); }}>
                ⬇ Télécharger
              </button>
              <span className="lightbox-name">{photos[lbIndex]?.name}</span>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type} show`}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}
