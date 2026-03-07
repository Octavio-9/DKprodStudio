# Guide d'installation rapide

## Étapes d'installation

### 1. Installer MySQL
Assurez-vous que MySQL est installé et démarré sur votre machine.

### 2. Installer les dépendances Node.js
```bash
npm install
```

### 3. Configurer l'environnement
Créez un fichier `.env` à la racine du projet :

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe_mysql
DB_NAME=photo_studio
PORT=3000
JWT_SECRET=changez-ce-secret-en-production
```

### 4. Démarrer le serveur
```bash
npm start
```

Le serveur va :
- Créer automatiquement la base de données `photo_studio`
- Créer toutes les tables nécessaires
- Créer l'utilisateur admin par défaut (admin/studio123)

### 5. Accéder à l'application
- Frontend : http://localhost:3000
- API : http://localhost:3000/api

## Dépannage

### Erreur de connexion MySQL
- Vérifiez que MySQL est démarré : `mysql -u root -p`
- Vérifiez les identifiants dans `.env`
- Assurez-vous que l'utilisateur MySQL a les droits de création de base

### Port déjà utilisé
Changez le `PORT` dans `.env` ou arrêtez le processus utilisant le port 3000.

### Module non trouvé
Exécutez `npm install` à nouveau.
