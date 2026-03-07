# Photo Studio App - Application de Gestion de Photos

Application web complète pour la gestion de séances photo avec base de données MySQL.

## 🚀 Fonctionnalités

- **Interface Client** : Accès aux photos via code unique
- **Interface Admin** : Gestion complète des séances et photos
- **Base de données MySQL** : Stockage persistant et sécurisé
- **Authentification JWT** : Sécurité renforcée
- **Upload de photos** : Compression automatique côté client
- **Galerie interactive** : Vue grille/liste avec lightbox

## 📋 Prérequis

- **Node.js** (v14 ou supérieur)
- **MySQL** (v5.7 ou supérieur, ou MariaDB)
- **npm** (inclus avec Node.js)

## 🔧 Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer la base de données

Créez un fichier `.env` à la racine du projet (copiez `config.example.env`) :

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=photo_studio
PORT=3000
JWT_SECRET=votre-secret-jwt-changez-en-production
```

### 3. Créer la base de données MySQL

La base de données sera créée automatiquement au premier démarrage du serveur. Assurez-vous que MySQL est démarré et que les identifiants dans `.env` sont corrects.

### 4. Démarrer le serveur

```bash
npm start
```

Pour le développement avec rechargement automatique :

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

## 🔐 Identifiants par défaut

- **Identifiant** : `admin`
- **Mot de passe** : `studio123`

⚠️ **Important** : Changez ces identifiants après la première connexion via les paramètres.

## 📁 Structure du projet

```
photo-studio-app/
├── server.js           # Serveur Express + API
├── package.json        # Dépendances Node.js
├── .env               # Configuration (à créer)
├── index.html         # Page d'accueil
├── admin.html         # Dashboard admin
├── admin-login.html   # Connexion admin
├── client.html        # Portail client
├── js/
│   ├── api.js         # Client API
│   ├── app.js         # Utilitaires partagés
│   └── admin.js       # Logique admin
└── css/
    └── style.css      # Styles
```

## 🗄️ Structure de la base de données

### Table `admins`
- `id` : Identifiant unique
- `username` : Nom d'utilisateur
- `password_hash` : Mot de passe hashé (bcrypt)
- `created_at` : Date de création

### Table `sessions`
- `id` : Identifiant unique
- `code` : Code d'accès client (6 caractères, unique)
- `client_name` : Nom du client
- `type` : Type de séance
- `note` : Note interne
- `created_at` : Date de création
- `expires_at` : Date d'expiration

### Table `photos`
- `id` : Identifiant unique
- `session_id` : Référence à la séance
- `name` : Nom du fichier
- `data_url` : Image en base64
- `size` : Taille en octets
- `created_at` : Date d'ajout

## 🔌 API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/update` - Mettre à jour les identifiants
- `GET /api/auth/verify` - Vérifier le token

### Sessions
- `GET /api/sessions` - Liste des séances (admin)
- `GET /api/sessions/:code` - Détails d'une séance
- `POST /api/sessions` - Créer une séance (admin)
- `DELETE /api/sessions/:code` - Supprimer une séance (admin)

### Photos
- `POST /api/sessions/:code/photos` - Ajouter des photos (admin)
- `DELETE /api/sessions/:code/photos/:photoId` - Supprimer une photo (admin)
- `DELETE /api/sessions/:code/photos` - Supprimer toutes les photos (admin)

### Statistiques
- `GET /api/stats` - Statistiques globales (admin)

## 🛠️ Technologies utilisées

- **Backend** : Node.js + Express
- **Base de données** : MySQL
- **Authentification** : JWT (jsonwebtoken)
- **Hachage** : bcryptjs
- **Frontend** : HTML5, CSS3, JavaScript vanilla

## 📝 Notes importantes

1. **Sécurité** : Changez le `JWT_SECRET` en production
2. **Stockage** : Les photos sont stockées en base64 dans MySQL (LONGTEXT)
3. **Performance** : Pour de grandes quantités de photos, envisagez un stockage externe (S3, Cloudinary)
4. **Backup** : Faites des sauvegardes régulières de la base de données MySQL

## 🐛 Dépannage

### Erreur de connexion MySQL
- Vérifiez que MySQL est démarré
- Vérifiez les identifiants dans `.env`
- Vérifiez que l'utilisateur MySQL a les droits de création de base de données

### Erreur "Token invalide"
- Déconnectez-vous et reconnectez-vous
- Vérifiez que le `JWT_SECRET` n'a pas changé

### Photos ne s'affichent pas
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que le serveur API est démarré
- Vérifiez les permissions CORS

## 📄 Licence

ISC

## 👤 Auteur

Développé pour DK Production / Lumière Studio
