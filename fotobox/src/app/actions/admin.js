"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/utils/supabase/server";
import { headers } from "next/headers";

// ── Service role client (server-only, never sent to browser) ──
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Rate limiting en mémoire (protection de base contre le brute-force) ──
const _rl = new Map();
async function checkRateLimit(action, max = 10) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? h.get("x-real-ip")
    ?? "unknown";
  const key = `${action}:${ip}`;
  const now = Date.now();
  const entry = _rl.get(key) ?? { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000; }
  entry.count++;
  _rl.set(key, entry);
  if (entry.count > max) throw new Error("Trop de tentatives. Réessayez dans une minute.");
}

// ── Helpers d'authentification ──
async function requireAuth() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) throw new Error("Non authentifié.");
  return user;
}

async function requireSuperAdmin() {
  const user = await requireAuth();
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin")
    throw new Error("Accès refusé : rôle insuffisant.");
  return user;
}

// ── Extraction du chemin de stockage depuis une URL publique ──
function extractStoragePath(url) {
  const marker = "/storage/v1/object/public/photos/";
  const idx = url.indexOf(marker);
  return idx !== -1 ? url.slice(idx + marker.length) : null;
}

// ═══════════════════════════════════════════
// SUPER ADMIN
// ═══════════════════════════════════════════

export async function getSuperUsers() {
  await requireSuperAdmin();

  const [
    { data: profiles, error: e1 },
    { data: { users }, error: e2 },
    { data: sessions, error: e3 },
    { data: photos, error: e4 },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin.from("sessions").select("id, admin_id"),
    supabaseAdmin.from("photos").select("id, session_id"),
  ]);

  if (e1 || e2 || e3 || e4) throw new Error("Erreur lors de la récupération des données.");

  const usersMap = new Map(users.map(u => [u.id, u.email]));

  return profiles.map(profile => {
    const userSessions = sessions.filter(s => s.admin_id === profile.id);
    const sessionIds = userSessions.map(s => s.id);
    const userPhotosCount = photos.filter(p => sessionIds.includes(p.session_id)).length;
    return {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      role: profile.role,
      email: usersMap.get(profile.id) || "",
      created_at: profile.created_at,
      sessions_count: userSessions.length,
      photos_count: userPhotosCount,
    };
  });
}

export async function deleteUser(userId) {
  const caller = await requireSuperAdmin();
  if (caller.id === userId)
    throw new Error("Vous ne pouvez pas supprimer votre propre compte.");

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error("Erreur lors de la suppression de l'utilisateur.");
  return { success: true };
}

export async function updateUser(userId, data) {
  await requireSuperAdmin();

  if (data.email || data.password) {
    const authUpdate = {};
    if (data.email) authUpdate.email = data.email;
    if (data.password) authUpdate.password = data.password;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate);
    if (error) throw new Error("Erreur lors de la mise à jour des identifiants.");
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ name: data.name, username: data.username })
    .eq("id", userId);

  if (profileError) throw new Error("Erreur lors de la mise à jour du profil.");
  return { success: true };
}

// ═══════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════

export async function getUserProfile(userId) {
  const user = await requireAuth();

  // Un admin peut seulement lire son propre profil
  // Un super_admin peut lire n'importe quel profil
  if (user.id !== userId) {
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles").select("role").eq("id", user.id).single();
    if (callerProfile?.role !== "super_admin")
      throw new Error("Accès refusé.");
  }

  const { data, error } = await supabaseAdmin
    .from("profiles").select("*").eq("id", userId).single();
  if (error) throw new Error("Profil introuvable.");
  return data;
}

export async function createSession(sessionData) {
  const user = await requireAuth();

  // Ignorer admin_id du client — toujours utiliser l'utilisateur authentifié
  const { admin_id: _ignored, ...safeData } = sessionData;

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert([{ ...safeData, admin_id: user.id }])
    .select()
    .single();

  if (error) throw new Error("Erreur lors de la création de la séance.");
  return data;
}

export async function registerPhoto(photoData) {
  const user = await requireAuth();

  // Vérifier que la session appartient à l'utilisateur authentifié
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("admin_id")
    .eq("id", photoData.session_id)
    .single();

  if (!session || session.admin_id !== user.id)
    throw new Error("Accès refusé : vous ne possédez pas cette séance.");

  const { data, error } = await supabaseAdmin
    .from("photos")
    .insert([photoData])
    .select()
    .single();

  if (error) throw new Error("Erreur lors de l'enregistrement de la photo.");
  return data;
}

export async function deleteSession(code) {
  const user = await requireAuth();

  // Vérifier la propriété avant suppression
  const { data: session } = await supabaseAdmin
    .from("sessions").select("admin_id").eq("code", code).single();

  if (!session || session.admin_id !== user.id)
    throw new Error("Accès refusé : séance introuvable ou non autorisée.");

  const { data: files } = await supabaseAdmin.storage.from("photos").list(code);
  if (files?.length > 0) {
    const paths = files.map(f => `${code}/${f.name}`);
    await supabaseAdmin.storage.from("photos").remove(paths);
  }

  const { error } = await supabaseAdmin.from("sessions").delete().eq("code", code);
  if (error) throw new Error("Erreur lors de la suppression de la séance.");
  return { success: true };
}

export async function deletePhoto(photoId) {
  const user = await requireAuth();

  // Récupérer la photo + vérifier ownership via JOIN sur sessions
  const { data: photo, error: fetchError } = await supabaseAdmin
    .from("photos")
    .select("url, sessions!inner(admin_id)")
    .eq("id", photoId)
    .single();

  if (fetchError || !photo) throw new Error("Photo introuvable.");
  if (photo.sessions.admin_id !== user.id) throw new Error("Accès refusé.");

  if (photo.url) {
    const path = extractStoragePath(photo.url);
    if (path) await supabaseAdmin.storage.from("photos").remove([path]);
  }

  const { error } = await supabaseAdmin.from("photos").delete().eq("id", photoId);
  if (error) throw new Error("Erreur lors de la suppression de la photo.");
  return { success: true };
}

export async function clearPhotos(sessionId) {
  const user = await requireAuth();

  // Vérifier la propriété de la session
  const { data: session } = await supabaseAdmin
    .from("sessions").select("admin_id").eq("id", sessionId).single();

  if (!session || session.admin_id !== user.id)
    throw new Error("Accès refusé.");

  const { data: photos, error: fetchError } = await supabaseAdmin
    .from("photos").select("url").eq("session_id", sessionId);

  if (fetchError) throw new Error("Erreur lors de la récupération des photos.");

  if (photos?.length > 0) {
    const paths = photos.map(p => extractStoragePath(p.url)).filter(Boolean);
    if (paths.length > 0) await supabaseAdmin.storage.from("photos").remove(paths);
  }

  const { error } = await supabaseAdmin.from("photos").delete().eq("session_id", sessionId);
  if (error) throw new Error("Erreur lors de la suppression des photos.");
  return { success: true };
}

// ═══════════════════════════════════════════
// CLIENT (public — rate limited)
// ═══════════════════════════════════════════

export async function getClientSession(code) {
  // Rate limiting : 10 tentatives par minute par IP
  await checkRateLimit("getClientSession", 10);

  // Validation du format du code (6 caractères alphanumériques majuscules)
  if (!code || !/^[A-Z0-9]{6}$/.test(code)) return null;

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions").select("*").eq("code", code).single();

  if (sessionError || !session) return null;

  const isExpired = new Date(session.expires_at) < new Date();
  if (isExpired) return { session, isExpired: true };

  const { data: photos, error: photosError } = await supabaseAdmin
    .from("photos").select("*").eq("session_id", session.id)
    .order("created_at", { ascending: true });

  if (photosError) throw new Error("Erreur lors du chargement des photos.");
  return { session, photos, isExpired: false };
}
