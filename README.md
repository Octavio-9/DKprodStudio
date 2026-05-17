# 📸 FotoBOX - Application de Gestion de Photos (DK prod Studio)

Bienvenue dans la nouvelle version modernisée de **FotoBOX**, l'application de livraison et gestion de galeries photo de **DK prod Studio**.

Cette version a été entièrement réécrite pour passer d'une architecture monolithique Node.js/Express avec Base64 en base de données à une architecture serverless moderne, ultra-rapide et hautement performante.

---

## 🚀 Nouvelle Stack Technique

* **Frontend** : **Next.js 14 (App Router)** avec **Tailwind CSS** et **Framer Motion** pour une interface interactive, moderne et fluide.
* **Backend (BaaS)** : **Supabase** pour une gestion robuste des données, de l'authentification et de la sécurité.
* **Stockage Cloud** : **Supabase Storage** pour l'hébergement hautement performant des photos (fini le stockage en base64 !).
* **Sécurité & Permissions** : **Row Level Security (RLS)** sur PostgreSQL couplé à des **Next.js Server Actions** s'exécutant côté serveur pour sécuriser l'accès aux données.

---

## 📁 Structure du Projet Simplifiée

Le projet est entièrement encapsulé dans le dossier [fotobox](file:///c:/Users/lenovo/.gemini/antigravity/scratch/photo-studio-app/fotobox) :

```
photo-studio-app/
├── fotobox/                 # Application Next.js principale
│   ├── src/
│   │   ├── app/
│   │   │   ├── actions/     # Server Actions (logique métier sécurisée)
│   │   │   ├── admin/       # Dashboard & Login d'administration
│   │   │   ├── client/      # Interface client de récupération (avec code d'accès)
│   │   │   └── components/  # Composants réutilisables (Drag & Drop, Lightbox...)
│   │   └── utils/           # Configuration Supabase
│   ├── public/              # Fichiers statiques, images et PWA
│   └── docs/                # Schémas et documentation technique
└── README.md                # Cette documentation
```

---

## 🔧 Installation et Lancement

### 1. Prérequis
Assurez-vous d'avoir **Node.js (v18 ou supérieur)** installé sur votre machine.

### 2. Configurer les variables d'environnement
Créez un fichier `.env.local` dans le dossier `fotobox/` avec les clés Supabase :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
```

### 3. Installer les dépendances
Déplacez-vous dans le dossier de l'application et installez les modules :

```bash
cd fotobox
npm install
```

### 4. Démarrer en développement
Pour lancer le serveur local de développement :

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`.

### 5. Compiler pour la production
Pour générer une build de production optimisée :

```bash
npm run build
npm start
```

---

## 🗄️ Base de Données & Schéma SQL

Le schéma SQL complet pour configurer votre base de données Supabase se trouve dans :
👉 [supabase_setup.sql](file:///c:/Users/lenovo/.gemini/antigravity/scratch/photo-studio-app/fotobox/docs/supabase_setup.sql)

Il définit les tables `profiles` (gestion des rôles admin/super_admin), `sessions` (codes d'accès clients) et `photos` (métadonnées des fichiers stockés).

---

## 👥 Auteur et Support

Développé avec ❤️ pour **DK Production / Lumière Studio**.
Pour toute question technique, contactez l'administrateur système.
