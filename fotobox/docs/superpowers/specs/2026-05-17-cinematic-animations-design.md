# Cinematic Animations — FotoBOX
**Date:** 2026-05-17
**Stack:** Next.js App Router · Framer Motion (existing) · GSAP + ScrollTrigger (new)

---

## Context

FotoBOX already has Framer Motion animations (blobs, stagger, parallax cards, CodeForm underlines). This spec layers a cinematic experience on top without removing existing motion — it upgrades and extends it.

---

## Features

### 1. Page Transitions
**Component:** `PageTransition.jsx` (wrapper) + changes to `layout.js`

- `AnimatePresence` added to `src/app/layout.js` around `{children}`
- Each page wrapped in a `motion.div` via `PageTransition.jsx`
- Animation: `opacity 0→1`, `y: 20→0`, duration `0.5s`, easing `easeOut`
- Exit: `opacity 1→0`, `y: -10`, duration `0.3s`
- Applied to: `/`, `/client/[code]`, `/admin/login`, `/admin/dashboard`
- Key: use `usePathname()` as AnimatePresence key to trigger on route change

### 2. Video Hero Background
**Component:** `VideoBackground.jsx`

- `<video autoPlay muted loop playsInline src="/videos/hero.mp4" />`
- Absolutely positioned, `object-fit: cover`, fills HeroSection
- Overlay: `linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%)`
- Existing AnimatedBlobs remain above the video (`z-index` layering: video → overlay → blobs → content)
- Mobile: video still plays (autoPlay muted works on iOS with playsInline)
- User provides `/public/videos/hero.mp4` (recommended source: Pexels — bokeh/studio theme)

### 3. Text Reveal — Film Style
**Component:** `TextReveal.jsx`

- Props: `lines` (string array — each item = one revealed line), `delay` (number, default 0), `className`
- Each line wrapped in `overflow: hidden` container
- Inner span animates: `y: "100%"→"0%"` + `opacity: 0→1` via Framer Motion
- Duration: `0.7s`, easing: `[0.25, 0.46, 0.45, 0.94]` (cubic-bezier, cinematic ease)
- Stagger between lines: `0.15s`
- Triggered by `useInView` with `once: true`
- Applied to: HeroSection title + subtitle, FeaturesSection heading, footer tagline

### 4. Cinematic Scroll
**GSAP ScrollTrigger in:** `HeroSection.jsx`, `FeaturesSection.jsx`, `page.js`

- Install: `npm install gsap`
- HeroSection pin: ScrollTrigger pins the hero while the next section scrolls up over it (`pin: true`, `scrub: 1`, `end: "+=400"`)
- Features section: each feature card has a GSAP parallax (`y: 60→0` as it enters viewport, `scrub: 0.5`)
- PhotoCollage: subtle `y: -40` parallax on scroll (existing mouse parallax stays)
- GSAP initialized in `useEffect`; cleanup calls `ScrollTrigger.kill()` to prevent memory leaks on unmount
- Mobile: ScrollTrigger disabled at `<768px` (performance + touch UX)

### 5. Aperture Cursor
**Component:** `CinematicCursor.jsx`

- Hidden on touch devices: `window.matchMedia("(pointer: coarse)")`
- SVG aperture: 8 blade clipPath, animated via Framer Motion `rotate` + `scale`
- States:
  - Default: blades at 60% open, scale 1, white + gold ring (#c9a84c)
  - Hover (over `a`, `button`, `[data-cursor="pointer"]`): blades close to 20%, scale 1.4
  - Click: flash open 100% → close 20% in 150ms
- Position: `position: fixed`, follows `mousemove` via `useMotionValue` + `useSpring` (stiffness 500, damping 30)
- Global `cursor: none` on `<body>` when component mounts

### 6. Reactive Light Field
**Part of:** `CinematicCursor.jsx`

- A second `div`: `400px` circle, `radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)`
- `mix-blend-mode: screen`, `pointer-events: none`, `position: fixed`
- Follows mouse with lerp lag (slower spring: stiffness 80, damping 20) — lags behind cursor
- On hover over cards/buttons: opacity increases `0.08→0.18`, radius expands to `600px`
- Creates studio spotlight effect across the page

### 7. Section Morph Divider
**Component:** `SectionMorphDivider.jsx`

- SVG `viewBox="0 0 1440 120"` between HeroSection and FeaturesSection
- `<path>` starts as a smooth wave, morphs to a diagonal cut as user scrolls
- GSAP ScrollTrigger animates `d` attribute from wave → angled shape (`scrub: true`)
- Both path strings are pre-defined with identical point counts (required for GSAP `d` morphing)
- Fill color: matches FeaturesSection background (`#0a0a0a`)
- Second divider between FeaturesSection and footer (static wave, no scroll animation)

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/app/layout.js` | Add `AnimatePresence` + `CinematicCursor` |
| `src/app/page.js` | Add `VideoBackground`, `SectionMorphDivider`, wrap sections |
| `src/app/components/HeroSection.jsx` | Replace title/subtitle with `TextReveal`, add GSAP pin |
| `src/app/components/FeaturesSection.jsx` | Add GSAP ScrollTrigger parallax per card + `TextReveal` on heading |
| `src/app/components/VideoBackground.jsx` | New component |
| `src/app/components/TextReveal.jsx` | New component |
| `src/app/components/CinematicCursor.jsx` | New component (cursor + light field) |
| `src/app/components/SectionMorphDivider.jsx` | New component |
| `src/app/components/PageTransition.jsx` | New component |
| `src/app/admin/dashboard/page.js` | Stagger cartes, modales AnimatePresence, upload progress, suppression animée, toasts |
| `public/css/style.css` | Add `body { cursor: none }` when cursor active, mobile overrides |
| `package.json` | Add `gsap` dependency |

---

## Performance Considerations

- GSAP ScrollTrigger disabled on mobile (`pointer: coarse` / `<768px`)
- Video: compressed MP4, max 10MB, `preload="none"` fallback if slow connection
- Light field div uses `will-change: transform` for GPU compositing
- Cursor uses `useSpring` already optimized via Framer Motion RAF loop
- `ScrollTrigger.kill()` called in `useEffect` cleanup to prevent memory leaks on unmount

---

### 8. Dashboard Admin — Animations fonctionnelles
**Files:** `src/app/admin/dashboard/page.js`, modales existantes

- **Cartes de séances** : apparition en stagger au chargement (`y: 20→0`, `opacity 0→1`, délai `0.05s * index`) via Framer Motion
- **Modales** (upload, suppression, création de séance) : entrée `scale 0.95→1` + `opacity 0→1`, sortie `scale 1→0.95` via `AnimatePresence`
- **Upload progress** : barre de progression animée (`scaleX: 0→1`) avec couleur qui change selon l'état (`compressing` → `uploading` → `done` → `error`)
- **Suppression de séance/photo** : carte disparaît avec `scale 1→0.8` + `opacity 1→0` avant retrait du DOM
- **Toast / alertes** : slide-in depuis la droite (`x: 60→0`), disparaît vers la droite à l'expiration
- **Boutons d'action** : `whileHover` scale `1→1.03`, `whileTap` scale `1→0.97`
- Curseur diaphragme actif dans le dashboard (déjà inclus via layout global)

---

## Out of Scope

- WebGL / Three.js effects
- Audio sync
- Loading screen / preloader animation
