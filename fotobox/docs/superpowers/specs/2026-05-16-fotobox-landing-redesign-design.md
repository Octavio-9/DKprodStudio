# Design Spec — FotoBOX Landing Page Redesign

**Date:** 2026-05-16  
**Statut:** Approuvé  

---

## Contexte

La page d'accueil actuelle (`src/app/page.js` + `src/app/components/CodeForm.jsx`) est fonctionnelle mais manque d'impact visuel et d'animations. L'objectif est de la refaire dans un style **Magazine Narratif** : éditorial sombre, typographie serif oversized, collage photo décalé, et animations Framer Motion. `framer-motion` est déjà installé.

---

## Fichiers concernés

| Fichier | Action |
|---|---|
| `src/app/page.js` | Réécriture complète |
| `src/app/components/CodeForm.jsx` | Réécriture complète (underline style) |
| `src/app/globals.css` | Ajout de classes utilitaires si nécessaire |

---

## Architecture

La page reste un **Server Component** (`page.js`). L'animation et l'interactivité sont isolées dans des Client Components. Le `CodeForm` devient un Client Component animé avec Framer Motion.

### Décomposition des composants

```
page.js (Server Component)
├── <Navbar />         — Client Component (glassmorphism, scroll-aware)
├── <HeroSection />    — Client Component (animations d'entrée)
│   ├── <HeroContent /> — titre, sous-titre, <CodeForm />
│   └── <PhotoCollage /> — les 3 cartes en rotation
├── <FeaturesSection /> — Client Component (scroll-reveal avec useInView)
└── <Footer />          — Server Component (statique)
```

---

## Design détaillé par section

### 1. Navbar

- **Fixed**, hauteur 56px, `backdrop-filter: blur(16px)`, `background: rgba(10,11,14,0.7)`
- Bordure basse : `1px solid rgba(201,168,76,0.1)`
- Logo : carré doré 28px + texte "FotoBOX" en letterspacing 3px
- Liens : "Accueil" (couleur muted) + bouton "Studio" (outline doré, border-radius 20px)
- **Animation Framer Motion** : `initial={{ y: -20, opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}`, delay 0.1s

### 2. Hero Section (100vh)

**Structure split** : contenu à gauche (flex: 1), collage à droite (flex: 0.9).

**Éléments décoratifs :**
- Chiffre "01" en filigrane géant (font-size: ~320px, opacity 3%, serif, centré en absolu)
- Ligne verticale dorée à gauche (`position: absolute, left: 60px`) — gradient transparent → doré → transparent
- Bokeh blobs animés (motion values, déplacement lent en boucle)

**Contenu gauche (HeroContent) :**
- Eyebrow : `— Studio Photo` (ligne dorée 32px + texte en letterspacing 4px)
- Titre : `font-family: Georgia, serif`, 56px, italic, "Vos photos / *vous attendent*" (em en doré)
- Sous-titre : 13px, couleur muted, max-width 380px
- `<CodeForm />` (voir section dédiée)

**Animations d'entrée (stagger séquentiel) :**
1. Eyebrow : fade + slide-up (delay 0.2s)
2. Titre : révélé **mot par mot** via `AnimatePresence` + stagger 0.08s par mot
3. Sous-titre : fade + slide-up (delay 0.6s)
4. CodeForm : fade + slide-up (delay 0.8s)

**Collage photos (PhotoCollage) :**
- 3 `<div>` simulant des photos avec dégradés sombres, rotations décalées (+3°, -5°, +1.5°), box-shadow prononcée
- Photo centrale : badge "✓ Session prête · N photos" en glassmorphism
- **Animation d'entrée :** chaque carte tombe depuis y: -40, spring (stiffness: 100, damping: 15), delays 0.4 / 0.6 / 0.8s
- **Hover parallax :** `useMotionValue` sur la position souris → légère rotation 3D des cartes (`rotateX`, `rotateY` ±5°)

**Scroll indicator :**
- Ligne verticale animée (pulse en boucle) + texte "SCROLL" en letterspacing
- `opacity: 0` déclenché quand scrollY > 100

### 3. CodeForm (Client Component)

**Style underline** : 6 caractères, chacun avec :
- Une lettre affichée en grand (20-24px, blanc)
- Une ligne horizontale dessous (1px)
  - Vide : `rgba(255,255,255,0.15)`
  - Remplie : gradient doré (via `motion.div` avec `scaleX: 1` animé)
  - Active (curseur) : doré + `box-shadow: 0 0 8px rgba(201,168,76,0.6)` + clignotement

**Logique :** Un `<input>` invisible de type `text` (maxLength 6, autoFocus optionnel) capte la saisie. Les 6 caractères sont extraits et affichés dans les 6 slots visuels.

**Bouton CTA :**
- Style outline doré, border-radius 3px, letterspacing 3px, uppercase
- Effet shimmer au hover (`::after` translateX)
- `whileHover={{ scale: 1.02 }}` Framer Motion
- Soumission → `router.push('/client/${code}')` (logique existante conservée)

### 4. Features Section

- `padding: 100px 60px`
- Ligne verticale dorée décorative (même style que hero)
- Grille 3 colonnes (gap 60px)
- Chaque feature :
  - Numéro `01` / `02` / `03` en serif, couleur dorée atténuée
  - Ligne dorée 32px (trait horizontal)
  - Titre en serif italic 18px
  - Description en 12px, couleur muted, line-height 1.7
- **Animation scroll :** `useInView` (threshold 0.2), `initial={{ y: 40, opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}`, stagger 0.15s entre les 3 items

### 5. Footer

- `padding: 28px 60px`
- Bordure haute : `1px solid rgba(255,255,255,0.04)`
- Flex space-between : copyright à gauche, "FOTOBOX" stylisé à droite
- Statique, pas d'animation

---

## Animations récapitulatif

| Élément | Animation | Trigger |
|---|---|---|
| Navbar | fade + slide-down | montage page |
| Titre | révélation mot par mot (stagger) | montage page |
| Eyebrow / Sous-titre / Form | fade + slide-up (stagger) | montage page |
| Photo cards | fall-in spring (stagger) | montage page |
| Photo collage | parallax 3D léger | hover souris |
| Scroll indicator | pulse boucle + disparition | scroll > 100px |
| Underline char | scaleX 0→1 doré | saisie utilisateur |
| Bouton CTA | shimmer + scale | hover |
| Features items | slide-up + fade | scroll (useInView) |

---

## Contraintes techniques

- **Pas de nouvelles dépendances** — `framer-motion` est déjà installé, Canvas API pour la compression.
- **SSR compatible** — les Client Components sont wrappés correctement (`"use client"`), `page.js` reste Server Component.
- **Responsive** — le split hero devient colonne unique en mobile (< 768px) : collage passe au-dessus du contenu, titre réduit à 36px.
- **Thème conservé** — toutes les variables CSS existantes (`--gold`, `--dark-2`, etc.) sont réutilisées.
- **CodeForm** — la logique de soumission existante (router.push) est conservée, seul le style visuel change.
