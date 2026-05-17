-- 1. Création de la table des profils administrateurs (liée à auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name VARCHAR(100),
  username VARCHAR(50) UNIQUE,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Trigger pour créer un profil automatiquement quand un user s'inscrit
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, username, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'name', 
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), 
    'admin'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Création de la table des séances
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_code ON sessions(code);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- 3. Création de la table des photos
CREATE TABLE photos (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  size INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_photos_session ON photos(session_id);

-- 4. Configuration du Storage (Stockage des photos)
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Mise en place de la sécurité (Row Level Security - RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Politiques pour les profils : un admin peut voir tous les profils, et modifier le sien
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Politiques pour les sessions : 
-- - Le client (anonyme) peut lire la session via le code
-- - L'admin peut tout faire sur ses propres sessions
CREATE POLICY "Anyone can view session if they have the code" ON sessions FOR SELECT USING (true);
CREATE POLICY "Admins can insert sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "Admins can update own sessions" ON sessions FOR UPDATE USING (auth.uid() = admin_id);
CREATE POLICY "Admins can delete own sessions" ON sessions FOR DELETE USING (auth.uid() = admin_id);

-- Politiques pour les photos :
-- - Le client peut voir les photos de la session (public)
-- - L'admin peut ajouter/supprimer des photos
CREATE POLICY "Anyone can view photos" ON photos FOR SELECT USING (true);
CREATE POLICY "Admins can insert photos" ON photos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete photos" ON photos FOR DELETE USING (auth.uid() IS NOT NULL);

-- Politiques pour le Storage (fichiers physiques)
CREATE POLICY "Images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Admins can upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete images" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);
