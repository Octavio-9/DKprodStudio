"use server";

import { createClient } from "@supabase/supabase-js";

function extractStoragePath(url) {
  const marker = "/storage/v1/object/public/photos/";
  const idx = url.indexOf(marker);
  return idx !== -1 ? url.slice(idx + marker.length) : null;
}

// Supabase client with Service Role Key to bypass RLS and manage auth users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function getSuperUsers() {
  // Fetch profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profilesError) throw new Error(profilesError.message);

  // Fetch emails from auth.users (requires service_role)
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  if (usersError) throw new Error(usersError.message);

  // Fetch sessions to count per user
  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from("sessions")
    .select("id, admin_id");
    
  if (sessionsError) throw new Error(sessionsError.message);

  // Fetch photos to count per session
  const { data: photos, error: photosError } = await supabaseAdmin
    .from("photos")
    .select("id, session_id");

  if (photosError) throw new Error(photosError.message);

  // Map users to emails and counts
  const usersMap = new Map(users.map(u => [u.id, u.email]));
  
  const formattedUsers = profiles.map(profile => {
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
      photos_count: userPhotosCount
    };
  });

  return formattedUsers;
}

export async function deleteUser(userId) {
  // Supprimer de auth.users (ça supprimera en cascade dans profiles, sessions, photos)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function updateUser(userId, data) {
  // Mettre à jour email et password si présents
  let authUpdate = {};
  if (data.email) authUpdate.email = data.email;
  if (data.password) authUpdate.password = data.password;

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate);
    if (error) throw new Error(error.message);
  }

  // Mettre à jour le profil (name, username)
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ name: data.name, username: data.username })
    .eq("id", userId);

  if (profileError) throw new Error(profileError.message);
  
  return { success: true };
}

export async function getUserProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createSession(sessionData) {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert([sessionData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function registerPhoto(photoData) {
  const { data, error } = await supabaseAdmin
    .from("photos")
    .insert([photoData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSession(code) {
  const { data: files } = await supabaseAdmin.storage.from("photos").list(code);
  if (files?.length > 0) {
    const paths = files.map(f => `${code}/${f.name}`);
    await supabaseAdmin.storage.from("photos").remove(paths);
  }

  const { error } = await supabaseAdmin.from("sessions").delete().eq("code", code);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function deletePhoto(photoId) {
  const { data: photo, error: fetchError } = await supabaseAdmin
    .from("photos")
    .select("url")
    .eq("id", photoId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  if (photo?.url) {
    const path = extractStoragePath(photo.url);
    if (path) await supabaseAdmin.storage.from("photos").remove([path]);
  }

  const { error } = await supabaseAdmin.from("photos").delete().eq("id", photoId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function clearPhotos(sessionId) {
  const { data: photos, error: fetchError } = await supabaseAdmin
    .from("photos")
    .select("url")
    .eq("session_id", sessionId);

  if (fetchError) throw new Error(fetchError.message);

  if (photos?.length > 0) {
    const paths = photos.map(p => extractStoragePath(p.url)).filter(Boolean);
    if (paths.length > 0) await supabaseAdmin.storage.from("photos").remove(paths);
  }

  const { error } = await supabaseAdmin.from("photos").delete().eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getClientSession(code) {
  // Fetch session
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("code", code)
    .single();

  if (sessionError || !session) return null;

  // Check expiry
  const isExpired = new Date(session.expires_at) < new Date();
  if (isExpired) return { session, isExpired: true };

  // Fetch photos
  const { data: photos, error: photosError } = await supabaseAdmin
    .from("photos")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  if (photosError) throw new Error(photosError.message);

  return { session, photos, isExpired: false };
}
