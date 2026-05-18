# FotoBOX — Documentation Technique Complète

> Ce fichier résume l'état complet du projet, la stack utilisée, l'architecture, les décisions de design et toutes les modifications effectuées. Il est destiné à permettre à n'importe quelle IA de reprendre le développement sans contexte préalable.

---

## Vue d'ensemble

**FotoBOX** est une application web de livraison de photos pour studio photo. Elle permet à un photographe (admin) de créer des sessions et d'uploader des photos, et aux clients d'accéder à leur galerie privée via un code à 6 caractères.

- **URL de production** : `https://fotobox.vercel.app` (alias Vercel)
- **Dépôt GitHub** : `https://github.com/Octavio-9/DKprodStudio`
- **Langue de l'interface** : Français

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| React | React | 19.2.4 |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) | @supabase/supabase-js ^2 |
| Animations | Framer Motion | ^12 |
| Animations | GSAP + ScrollTrigger | ^3.15 |
| CSS | Tailwind CSS v4 + PostCSS | ^4 |
| CSS global | `/public/css/style.css` (chargé via `<link>`) | — |
| Fonts | Google Fonts via `next/font`: Playfair Display + Inter | — |
| PWA | manifest.json + service-worker.js | — |

### Variables d'environnement requises

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Architecture du projet

```
fotobox/
├── src/
│   ├── app/
│   │   ├── layout.js                  # Root layout — charge ClientLayout (AnimatePresence + Cursor)
│   │   ├── page.js                    # Page d'accueil (landing cinématographique)
│   │   ├── globals.css                # Styles Tailwind (reset basique)
│   │   ├── actions/
│   │   │   └── admin.js               # Server Actions Next.js (toutes les ops admin sécurisées)
│   │   ├── admin/
│   │   │   ├── login/page.js          # Page de login admin (Supabase Auth)
│   │   │   └── dashboard/page.js      # Dashboard admin (client component massif)
│   │   ├── client/[code]/
│   │   │   ├── page.js                # Server Component — vérifie le code, charge les photos
│   │   │   └── ClientGallery.jsx      # Client Component — galerie avec lightbox, swipe, téléchargement
│   │   └── components/
│   │       ├── ClientLayout.jsx       # "use client" — AnimatePresence + CinematicCursor
│   │       ├── PageTransition.jsx     # Wrapper de transition de page (opacity + y)
│   │       ├── CinematicCursor.jsx    # Curseur SVG aperture personnalisé (desktop only)
│   │       ├── HeroSection.jsx        # Section hero (GSAP pin + parallax, TextReveal, CodeForm)
│   │       ├── FeaturesSection.jsx    # Section features avec parallax GSAP
│   │       ├── TextReveal.jsx         # Animation de révélation de texte ligne par ligne
│   │       ├── SectionMorphDivider.jsx # Séparateur SVG morphing entre sections
│   │       ├── AnimatedBlobs.jsx      # Blobs bokeh animés en fond
│   │       ├── PhotoCollage.jsx       # Collage de photos flottantes (hero desktop)
│   │       ├── CodeForm.jsx           # Formulaire de saisie du code client
│   │       ├── Navbar.jsx             # Barre de navigation
│   │       └── VideoBackground.jsx    # (créé mais non utilisé — vidéo hero retirée)
│   ├── middleware.js                  # Middleware Next.js (refresh session Supabase)
│   └── utils/supabase/
│       ├── client.js                  # createBrowserClient Supabase
│       └── server.js                  # createServerClient Supabase (cookies SSR)
├── public/
│   ├── css/style.css                  # Styles principaux du projet (tout le design system)
│   ├── images/                        # hero-1.png, hero-2.png, hero-3.png, logo.png
│   ├── videos/hero.mp4                # Vidéo hero (présente mais non utilisée)
│   ├── manifest.json                  # PWA manifest
│   └── service-worker.js              # Service worker PWA
├── docs/
│   ├── supabase_setup.sql             # Schéma initial de la base de données
│   ├── security-rls-fix.sql           # Fix RLS storage (voir section Supabase)
│   └── superpowers/                   # Specs et plans de développement (IA)
├── next.config.mjs                    # Config Next.js (security headers + CSP)
├── jsconfig.json                      # Alias @/* → ./src/*
└── create-super-admin.mjs             # Script Node pour créer un super admin
```

---

## Base de données Supabase

### Tables

#### `profiles`
```sql
id UUID PRIMARY KEY  -- référence auth.users
name VARCHAR(100)
username VARCHAR(50) UNIQUE
role VARCHAR(20) DEFAULT 'admin'  -- valeurs: 'admin', 'super_admin'
created_at TIMESTAMPTZ
```
Créé automatiquement via trigger `on_auth_user_created` lors de l'inscription.

#### `sessions`
```sql
id SERIAL PRIMARY KEY
code VARCHAR(6) UNIQUE NOT NULL     -- code d'accès client (ex: "AB12CD")
client_name VARCHAR(255) NOT NULL
type VARCHAR(100) NOT NULL           -- type de séance (ex: "Portrait", "Mariage")
note TEXT
created_at TIMESTAMPTZ
expires_at TIMESTAMPTZ NOT NULL      -- date d'expiration de l'accès client
admin_id UUID REFERENCES auth.users  -- admin propriétaire
```

#### `photos`
```sql
id SERIAL PRIMARY KEY
session_id INT REFERENCES sessions(id) ON DELETE CASCADE
name VARCHAR(255)
url TEXT                             -- URL publique Supabase Storage
size INT
created_at TIMESTAMPTZ
```

### Storage

- **Bucket** : `photos` (public)
- **Structure des chemins** : `{session_code}/{filename}` (ex: `AB12CD/photo-01.jpg`)

### RLS (Row Level Security)

**IMPORTANT** : Il existe un bug connu. La policy de storage par défaut bloque les uploads avec `WITH CHECK (false)`. Le fix à appliquer dans le SQL Editor Supabase est :

```sql
-- Supprimer la policy bloquante
DROP POLICY IF EXISTS "No direct storage write" ON storage.objects;

-- Créer la policy correcte (vérifie que le code de session appartient à l'admin)
CREATE POLICY "Admins can upload to own sessions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos' AND
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.code = split_part(name, '/', 1)
        AND sessions.admin_id = auth.uid()
    )
  );
```

Ce fix est aussi dans `docs/security-rls-fix.sql`.

---

## Design System

Tout le design system est dans `/public/css/style.css`. Les variables CSS principales :

```css
--dark: #0a0b0e          /* fond principal */
--gold: #c9a84c          /* couleur accent or */
--text: #e8e0d0          /* texte principal */
--text-muted: #8a8070    /* texte secondaire */
--font-playfair: ...     /* serif italique (titres) */
--font-inter: ...        /* sans-serif (corps) */
--surface: #12141a       /* fond des cards */
--border: rgba(255,255,255,0.06) /* bordures subtiles */
```

**Classes utilitaires importantes** :
- `.btn-primary` — bouton or rempli
- `.btn-secondary` — bouton contour
- `.hero-section` — section hero avec layout flex
- `.admin-layout` — grid CSS du dashboard admin
- `.gallery-grid` / `.list-view` — grille de la galerie client
- `.lightbox` / `.lightbox-inner` — lightbox plein écran
- `.toast-container` — notifications toast

---

## Composants principaux

### `ClientLayout.jsx`
- `"use client"` — ponte entre Server Components et hooks client
- Monte `CinematicCursor` (desktop seulement)
- `AnimatePresence mode="wait"` avec `usePathname()` comme key pour les transitions de page

### `CinematicCursor.jsx`
- Curseur SVG 24×24px en forme d'aperture photographique
- Springs Framer Motion : `stiffness: 900, damping: 40` (très réactif)
- Comportement :
  - **Par défaut** : point blanc (r=2.5) + anneau or (r=7, opacité 75%)
  - **Hover sur button/a** : lames d'aperture apparaissent, anneau s'agrandit (r=10)
  - **Click** : trou intérieur s'agrandit (r=9)
- Champ de lumière : `div` 400px radial-gradient blanc, `mixBlendMode: screen`, lag spring `stiffness: 80`
- Masqué sur mobile (`pointer: coarse`)

### `HeroSection.jsx`
- GSAP `matchMedia("(min-width: 768px)")` pour desktop only :
  - `ScrollTrigger.create({ pin: true, end: "+=400" })` — hero épinglé au scroll
  - Parallax du collage : `gsap.to(collageWrapRef, { y: -40, scrub: 1 })`
- Cleanup via `gsap.context()` + `ctx.revert()` (scope isolation)
- `TextReveal` sur le sous-titre
- Strip de photos animées sur mobile (`hero-mobile-photos`) — visible uniquement mobile via CSS

### `TextReveal.jsx`
- Props : `lines[]`, `delay`, `className`, `style`
- Chaque ligne : container `overflow: hidden` + `motion.span` glissant depuis `y: "110%"`
- Déclenchement : `useInView({ once: true, amount: 0.3 })`
- Easing : `[0.25, 0.46, 0.45, 0.94]`, durée 0.7s, stagger 0.15s/ligne

### `ClientGallery.jsx`
- Modes : grille / liste (toggle)
- Sélection multiple avec téléchargement groupé
- **Lightbox** :
  - Navigation clavier (←/→/Escape)
  - Swipe tactile : `touchstart`/`touchend`, seuil 50px horizontal dominant
  - Animations de slide CSS keyframes (`lb-from-right`, `lb-from-left`)
  - Indicateurs dots (pill or pour actif)
- **Téléchargement** :
  - Conversion WebP → JPEG via Canvas API (`toJpegBlob()`) pour compatibilité galerie iOS/Android
  - Mobile (`pointer: coarse`) : Web Share API → native "Enregistrer dans Photos"
  - Desktop / fallback : `<a download>` classique

### `AdminDashboard` (`admin/dashboard/page.js`)
- `"use client"` — gère tout l'état en client-side
- Vues : `dashboard`, `sessions`, `session-detail`, `settings`, `super`
- **Navigation mobile** :
  - `mobileMenuOpen` state
  - Sidebar en `position: fixed` avec `transform: translateX(-100%)` → `translateX(0)` quand ouvert
  - Backdrop overlay semi-transparent
  - Header mobile sticky avec bouton hamburger (3 `<span>`)
- **Animations Framer Motion** :
  - Cards sessions : stagger `delay: Math.min(i * 0.05, 0.3)`
  - Modals : `AnimatePresence` + scale 0.95→1 + y 20→0
  - Toast : `initial={{ opacity: 0, x: 60 }}`
  - Barre de progression upload : `motion.div scaleX`
- **En-tête session detail** :
  - `<h2>` nom client
  - `<p>` type · date + code cliquable (pill, opacité 0.7, `onClick: copyText(code)`)
  - Bouton `[📋 Copier le lien]` (btn-secondary, couleur or) — copie l'URL `/client/{code}`
  - Bouton `[➕ Ajouter des photos]` (btn-primary, motion.button)

### Server Actions (`actions/admin.js`)
- `"use server"` — toutes les mutations DB passent par là
- Client Supabase avec `SUPABASE_SERVICE_ROLE_KEY` (jamais exposé au browser)
- Rate limiting en mémoire (10 req/min par IP)
- `requireAuth()` — vérifie session Supabase
- `requireSuperAdmin()` — vérifie rôle `super_admin` dans `profiles`
- Fonctions : `getSuperUsers`, `createSession`, `registerPhoto`, `deleteSession`, `deletePhoto`, `clearPhotos`, `getUserProfile`, `updateUser`, `deleteUser`

---

## Modifications effectuées (historique)

### Landing page cinématographique
1. **Transitions de page** : `ClientLayout.jsx` + `PageTransition.jsx` avec `AnimatePresence`
2. **Curseur personnalisé** : `CinematicCursor.jsx` — aperture SVG 24px, hover-only activation
3. **TextReveal** : `TextReveal.jsx` — slide-up par ligne avec `useInView`
4. **GSAP ScrollTrigger** : hero pin + parallax collage (desktop), features parallax
5. **SectionMorphDivider** : SVG wave/diagonal cross-fade au scroll
6. **AnimatedBlobs** : blobs bokeh animés en fond de page
7. **Vidéo hero** : `VideoBackground.jsx` créé PUIS retiré (user n'aimait pas)

### Dashboard admin
8. **Mobile menu** : hamburger + sidebar drawer + backdrop overlay
9. **Animations fonctionnelles** : cards, modals, toast, progress bar, boutons

### Galerie client
10. **Swipe lightbox** : navigation tactile avec seuil horizontal/vertical
11. **Téléchargement galerie** : Canvas JPEG + Web Share API mobile, `<a download>` desktop
12. **Indicateurs dots** : lightbox avec pills animées

### Session detail
13. **Copier le lien** : bouton `📋 Copier le lien` → copie `window.location.origin + /client/{code}`
14. **Redesign header** : code dans le sous-titre (discret), lien mis en avant

### Bugs corrigés
- **RLS Storage** : `WITH CHECK (false)` bloquait tous les uploads → fix via `split_part(name, '/', 1)`
- **GSAP cleanup** : `ScrollTrigger.getAll().kill()` détruisait tous les triggers → fix avec `gsap.context()` scopé
- **Web Share sur desktop** : `navigator.canShare` vrai sur Chrome desktop → ajout de `pointer: coarse`
- **Mobile header hauteur** : `grid-template-rows: auto 1fr` manquant → header invisible

---

## Points d'attention importants

### Next.js 16 App Router
- Cette version a des breaking changes vs les versions précédentes
- Lire `node_modules/next/dist/docs/` avant de modifier les APIs
- Les Server Components ne peuvent pas utiliser `useState`/`useEffect` — les envelopper dans `"use client"`
- Les Server Actions doivent avoir `"use server"` en tête de fichier

### GSAP dans Next.js
- Toujours enregistrer les plugins côté client : `gsap.registerPlugin(ScrollTrigger)` dans `useEffect`
- Utiliser `gsap.matchMedia()` pour les breakpoints responsive
- Utiliser `gsap.context()` pour scoper le cleanup — **ne jamais** utiliser `ScrollTrigger.getAll().kill()` globalement
- Pattern de cleanup :
  ```js
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px)", () => {
      const ctx = gsap.context(() => { /* tweens ici */ });
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  ```

### Supabase Storage
- Bucket `photos` public
- Chemins : `{session_code}/{filename}`
- RLS : vérifier que le fix storage est appliqué (voir section ci-dessus)
- Pour supprimer une photo : supprimer dans `photos` table ET dans `storage.objects`

### CSS Architecture
- Le design system principal est dans `/public/css/style.css` (chargé via `<link>` dans `layout.js`)
- `globals.css` ne contient que l'import Tailwind et quelques resets basiques
- Breakpoint mobile : `@media (max-width: 900px)` pour le dashboard
- Les curseurs custom : `cursor: none !important` sur `*, *::before, *::after` pour les appareils `pointer: fine`

---

## Commandes utiles

```bash
# Développement
npm run dev

# Build production
npm run build

# Créer un super admin
node create-super-admin.mjs

# Déploiement (Vercel CLI)
vercel --prod
```

---

## Ce qui reste à faire / idées futures

- Ajouter des notifications par email quand les photos sont prêtes
- Page de profil admin éditable
- Statistiques avancées (vues par session, téléchargements)
- Watermark optionnel sur les photos
- Possibilité pour le client de sélectionner ses photos favorites
- Monétisation SaaS : plans, limites de sessions/photos, facturation
