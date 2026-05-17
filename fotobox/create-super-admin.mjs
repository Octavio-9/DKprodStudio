import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

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

async function createSuperAdmin() {
  const email = "admin@dkprod.com";
  const password = "admin123";
  const name = "Super Admin";

  console.log("Création du compte Super Admin en cours...");

  // 1. Créer l'utilisateur dans auth.users
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });

  if (userError) {
    if (userError.message.includes("already registered")) {
      console.log("✅ L'utilisateur existe déjà. Récupération de son ID...");
    } else {
      console.error("❌ Erreur lors de la création de l'utilisateur:", userError.message);
      return;
    }
  }

  // Obtenir l'ID (soit le nouveau, soit l'existant)
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const adminUser = usersData.users.find(u => u.email === email);

  if (!adminUser) {
    console.error("❌ Impossible de trouver l'utilisateur.");
    return;
  }

  // 2. Mettre à jour le rôle dans la table profiles
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ role: "super_admin", name: name })
    .eq("id", adminUser.id);

  if (profileError) {
    console.error("❌ Erreur lors de la mise à jour du profil:", profileError.message);
  } else {
    console.log(`✅ Compte Super Admin prêt !`);
    console.log(`✉️ Email : ${email}`);
    console.log(`🔑 Mot de passe : ${password}`);
  }
}

createSuperAdmin();
