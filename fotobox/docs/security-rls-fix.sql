-- =============================================================
-- CORRECTIFS DE SÉCURITÉ RLS — FotoBOX
-- À exécuter dans le SQL Editor de Supabase
-- =============================================================

-- ── 1. SESSIONS ──────────────────────────────────────────────
-- PROBLÈME : USING (true) expose toutes les sessions à quiconque
--            peut requêter la table (via anon key).
-- CORRECTION : Restreindre SELECT aux sessions non-expirées
--              (les admins peuvent tout voir via service_role).

DROP POLICY IF EXISTS "Anyone can view session if they have the code" ON sessions;

-- Le code lui-même est le facteur d'accès — la vérification se fait
-- dans la Server Action getClientSession (code + expiry check).
-- La politique RLS laisse passer uniquement les sessions valides.
CREATE POLICY "Public can select non-expired sessions" ON sessions
  FOR SELECT USING (expires_at > now());

-- Les policies admin restent inchangées (déjà correctes)
-- CREATE POLICY "Admins can insert sessions" → auth.uid() = admin_id  ✓
-- CREATE POLICY "Admins can update own sessions" → auth.uid() = admin_id  ✓
-- CREATE POLICY "Admins can delete own sessions" → auth.uid() = admin_id  ✓


-- ── 2. PHOTOS ─────────────────────────────────────────────────
-- PROBLÈME : N'importe quel utilisateur authentifié peut supprimer
--            N'IMPORTE quelle photo (auth.uid() IS NOT NULL).
-- CORRECTION : Restreindre aux photos des sessions appartenant à l'admin.

DROP POLICY IF EXISTS "Admins can delete photos" ON photos;

CREATE POLICY "Admins can delete own photos" ON photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = photos.session_id
        AND sessions.admin_id = auth.uid()
    )
  );

-- PROBLÈME : N'importe quel utilisateur authentifié peut insérer
--            des photos dans n'importe quelle session.
-- CORRECTION : Restreindre aux sessions appartenant à l'admin.

DROP POLICY IF EXISTS "Admins can insert photos" ON photos;

CREATE POLICY "Admins can insert own photos" ON photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = photos.session_id
        AND sessions.admin_id = auth.uid()
    )
  );


-- ── 3. STORAGE ────────────────────────────────────────────────
-- PROBLÈME : N'importe quel utilisateur authentifié peut supprimer
--            n'importe quel fichier dans le bucket photos.
-- CORRECTION : Restreindre aux fichiers dans le dossier de ses propres séances
--              (le dossier = code de session, qui appartient à l'admin).

DROP POLICY IF EXISTS "Admins can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload images" ON storage.objects;

-- L'upload et la suppression sont gérés via service_role côté serveur.
-- On bloque donc simplement tout accès storage authentifié direct.
-- Les opérations passent toutes par les Server Actions (service_role).
CREATE POLICY "No direct storage write" ON storage.objects
  FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct storage delete" ON storage.objects
  FOR DELETE USING (false);

-- La lecture publique reste possible (photos accessibles par URL)
-- CREATE POLICY "Images are publicly accessible" → déjà correcte  ✓


-- ── 4. PROFILS ────────────────────────────────────────────────
-- Policies existantes correctes, aucun changement nécessaire.
-- SELECT : auth.uid() IS NOT NULL  ✓
-- UPDATE : auth.uid() = id  ✓


-- =============================================================
-- RÉSUMÉ DES CHANGEMENTS
-- =============================================================
-- sessions  : SELECT limité aux séances non-expirées
-- photos    : INSERT/DELETE vérifiés via JOIN sur sessions.admin_id
-- storage   : Écriture directe bloquée (passe par service_role)
-- =============================================================
