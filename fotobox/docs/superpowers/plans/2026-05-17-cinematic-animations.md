# Cinematic Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layer cinematic animations (page transitions, video hero, text reveal, cinematic scroll, aperture cursor, reactive light field, section morph divider, and admin dashboard functional animations) onto FotoBOX using Framer Motion + GSAP.

**Architecture:** A `ClientLayout.jsx` Server→Client bridge hosts global `AnimatePresence` and `CinematicCursor`. New reusable components (`TextReveal`, `VideoBackground`, `SectionMorphDivider`, `PageTransition`) compose into existing pages. GSAP ScrollTrigger drives cinematic scroll; Framer Motion drives all state-based animations. Both libraries coexist without conflict.

**Tech Stack:** Next.js 16 App Router · Framer Motion 11 (existing) · GSAP 3 + ScrollTrigger (new)

---

## File Map

| Status | File | Role |
|--------|------|------|
| New | `src/app/components/PageTransition.jsx` | motion.div wrapper for page enter/exit |
| New | `src/app/components/ClientLayout.jsx` | "use client" bridge: AnimatePresence + CinematicCursor |
| New | `src/app/components/VideoBackground.jsx` | Muted autoplay video + overlay for HeroSection |
| New | `src/app/components/TextReveal.jsx` | Film-style line-by-line text reveal |
| New | `src/app/components/CinematicCursor.jsx` | Aperture SVG cursor + reactive light field |
| New | `src/app/components/SectionMorphDivider.jsx` | SVG divider that cross-fades wave→diagonal on scroll |
| Modify | `src/app/layout.js` | Wrap body children with ClientLayout |
| Modify | `src/app/page.js` | Add PageTransition, VideoBackground, SectionMorphDivider, TextReveal on footer |
| Modify | `src/app/components/HeroSection.jsx` | Add VideoBackground, TextReveal on subtitle, GSAP pin + parallax |
| Modify | `src/app/components/FeaturesSection.jsx` | Add TextReveal on heading, GSAP card parallax |
| Modify | `src/app/client/[code]/page.js` | Wrap with PageTransition |
| Modify | `src/app/admin/login/page.js` | Wrap with PageTransition |
| Modify | `src/app/admin/dashboard/page.js` | Stagger cards, AnimatePresence modals, animated toast, upload progress |
| Modify | `public/css/style.css` | cursor:none on body, mobile cursor override |

---

## Task 1: Install GSAP

**Files:**
- Modify: `fotobox/package.json`

- [ ] **Step 1: Install GSAP**

```bash
cd fotobox && npm install gsap
```

Expected output: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Verify installation**

```bash
node -e "const g = require('./fotobox/node_modules/gsap'); console.log(g.gsap.version)"
```

Expected: prints a version like `3.12.x`.

- [ ] **Step 3: Commit**

```bash
git add fotobox/package.json fotobox/package-lock.json
git commit -m "chore: install gsap for cinematic scroll animations"
```

---

## Task 2: PageTransition + ClientLayout (global animation infrastructure)

**Files:**
- Create: `src/app/components/PageTransition.jsx`
- Create: `src/app/components/ClientLayout.jsx`
- Modify: `src/app/layout.js`

- [ ] **Step 1: Create PageTransition.jsx**

```jsx
// src/app/components/PageTransition.jsx
"use client";
import { motion } from "framer-motion";

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Create ClientLayout.jsx**

`CinematicCursor` is imported here but created in Task 9 — add a placeholder export for now so layout builds.

```jsx
// src/app/components/ClientLayout.jsx
"use client";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

// CinematicCursor imported in Task 9 — placeholder for now
function CinematicCursorPlaceholder() { return null; }

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  return (
    <>
      <CinematicCursorPlaceholder />
      <AnimatePresence mode="wait" initial={false}>
        <div key={pathname} style={{ minHeight: "100vh" }}>
          {children}
        </div>
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 3: Update layout.js to use ClientLayout**

Replace the existing `src/app/layout.js` with:

```jsx
// src/app/layout.js
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "./components/ClientLayout";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "FotoBOX – Récupération de Photos",
  description: "Récupérez vos photos de séance en toute simplicité.",
  icons: { icon: "/images/logo.png" },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <link rel="stylesheet" href="/css/style.css" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Run dev server and verify no errors**

```bash
cd fotobox && npm run dev
```

Open `http://localhost:3000`. Page should load normally. Check the browser console for errors.

- [ ] **Step 5: Commit**

```bash
git add fotobox/src/app/components/PageTransition.jsx fotobox/src/app/components/ClientLayout.jsx fotobox/src/app/layout.js
git commit -m "feat: add ClientLayout with AnimatePresence and PageTransition component"
```

---

## Task 3: Apply PageTransition to all pages

**Files:**
- Modify: `src/app/page.js`
- Modify: `src/app/client/[code]/page.js`
- Modify: `src/app/admin/login/page.js`
- Modify: `src/app/admin/dashboard/page.js`

- [ ] **Step 1: Wrap landing page**

In `src/app/page.js`, import PageTransition and wrap the `<main>`:

```jsx
import PageTransition from "./components/PageTransition";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import AnimatedBlobs from "./components/AnimatedBlobs";

export default function Home() {
  return (
    <PageTransition>
      <main style={{ background: "var(--dark)", minHeight: "100vh", overflowX: "hidden" }}>
        <AnimatedBlobs />
        <Navbar />
        <HeroSection />
        <FeaturesSection />
        <footer style={{
          padding: "28px 60px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <span style={{ fontSize: "11px", color: "#444", letterSpacing: "1px" }}>
            © {new Date().getFullYear()} FotoBOX · Tous droits réservés
          </span>
          <span style={{
            fontSize: "10px", letterSpacing: "3px",
            color: "#333", fontWeight: 700,
            fontFamily: "var(--font-playfair)"
          }}>
            FOTOBOX
          </span>
        </footer>
      </main>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Wrap client gallery page**

In `src/app/client/[code]/page.js`, import PageTransition and wrap the returned `<main>`:

```jsx
import { getClientSession } from "@/app/actions/admin";
import ClientGallery from "./ClientGallery";
import PageTransition from "@/app/components/PageTransition";
import Link from "next/link";
import Image from "next/image";

export default async function ClientPage({ params }) {
  const { code } = await params;
  const result = await getClientSession(code);

  if (!result || result.isExpired) {
    const isExpired = result?.isExpired;
    return (
      <PageTransition>
        <main className="client-page">
          {/* existing content unchanged — only the wrapper changes */}
          <div className="bg-blobs">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>
          </div>
          <header className="main-header">
            <Link href="/" className="logo">
              <Image src="/images/logo.png" width={40} height={40} className="logo-img" alt="FotoBOX Logo" />
              <span className="dynamic-text">FotoBOX</span>
            </Link>
            <nav className="main-nav">
              <Link href="/" className="nav-link">Accueil</Link>
              <Link href="#" className="nav-link active">Mes Photos</Link>
              <Link href="/admin/login" className="nav-btn-outline">Studio</Link>
            </nav>
          </header>
          <div id="clientRoot" style={{ position: "relative", zIndex: 1 }}>
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 32px" }}>
              <div className="glass-card" style={{ padding: "48px", maxWidth: "420px", textAlign: "center", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ fontSize: "3rem" }}>🔐</div>
                <h2 style={{ fontFamily: "var(--font-playfair)" }}>Accès non autorisé</h2>
                <p style={{ color: "var(--text-muted)", fontSize: ".9rem" }}>
                  {isExpired ? "Ce lien a expiré. Contactez le studio pour prolonger l'accès." : "Code invalide ou séance introuvable. Veuillez vérifier votre code."}
                </p>
                <Link href="/" className="btn-primary" style={{ textDecoration: "none", justifyContent: "center" }}>← Retour à l'accueil</Link>
              </div>
            </div>
          </div>
        </main>
      </PageTransition>
    );
  }

  const { session, photos } = result;
  return (
    <PageTransition>
      <main className="client-page">
        <div className="bg-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>
        <header className="main-header">
          <Link href="/" className="logo">
            <Image src="/images/logo.png" width={40} height={40} className="logo-img" alt="FotoBOX Logo" />
            <span className="dynamic-text">FotoBOX</span>
          </Link>
          <nav className="main-nav">
            <Link href="/" className="nav-link">Accueil</Link>
            <Link href="#" className="nav-link active">Mes Photos</Link>
            <Link href="/admin/login" className="nav-btn-outline">Studio</Link>
          </nav>
        </header>
        <div id="clientRoot" style={{ position: "relative", zIndex: 1 }}>
          <ClientGallery session={session} initialPhotos={photos || []} />
        </div>
      </main>
    </PageTransition>
  );
}
```

- [ ] **Step 3: Wrap admin login page**

In `src/app/admin/login/page.js`, add at the top of the returned JSX:

```jsx
// At top of file, add import:
import PageTransition from "@/app/components/PageTransition";

// In the return statement, wrap the outermost div:
return (
  <PageTransition>
    <div className="auth-page">
      {/* ... all existing content unchanged ... */}
    </div>
  </PageTransition>
);
```

- [ ] **Step 4: Wrap admin dashboard page**

In `src/app/admin/dashboard/page.js`, add import at the top and wrap the return:

```jsx
// Add import at the top of the file (after existing imports):
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/app/components/PageTransition";

// In the return statement (around line 220), wrap the outermost div:
return (
  <PageTransition>
    <div className="admin-layout" style={{ background: "var(--dark-2)", minHeight: "100vh" }}>
      {/* ... all existing content unchanged ... */}
    </div>
  </PageTransition>
);
```

- [ ] **Step 5: Verify transitions**

Run `npm run dev`. Navigate between `/`, `/admin/login`, and `/admin/dashboard`. Confirm a smooth fade+slide transition plays on each navigation.

- [ ] **Step 6: Commit**

```bash
git add fotobox/src/app/page.js fotobox/src/app/client/[code]/page.js fotobox/src/app/admin/login/page.js fotobox/src/app/admin/dashboard/page.js
git commit -m "feat: apply cinematic page transitions to all routes"
```

---

## Task 4: VideoBackground component + HeroSection integration

**Files:**
- Create: `src/app/components/VideoBackground.jsx`
- Modify: `src/app/components/HeroSection.jsx`

**Prerequisite:** Download a bokeh/studio stock video from Pexels, rename it to `hero.mp4`, and place it at `fotobox/public/videos/hero.mp4`. The video should be compressed to under 10MB (use HandBrake or similar). Create the `public/videos/` directory first.

- [ ] **Step 1: Create VideoBackground.jsx**

```jsx
// src/app/components/VideoBackground.jsx
"use client";

export default function VideoBackground() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      zIndex: 0, overflow: "hidden",
      pointerEvents: "none",
    }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        src="/videos/hero.mp4"
        style={{
          width: "100%", height: "100%",
          objectFit: "cover", display: "block",
        }}
      />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%)",
      }} />
    </div>
  );
}
```

- [ ] **Step 2: Integrate into HeroSection**

In `src/app/components/HeroSection.jsx`, import VideoBackground and add it as the first child of the `<section>`:

```jsx
// Add to imports at top:
import VideoBackground from "./VideoBackground";

// Inside the return, add as FIRST child of <section> (before the "01" watermark div):
<section className="hero-section" style={{
  display: "flex", alignItems: "center",
  position: "relative", overflow: "hidden"
}}>
  <VideoBackground />   {/* ← ADD THIS */}
  
  {/* Chiffre 01 en filigrane */}
  <div style={{ ... }}>01</div>
  {/* ... rest unchanged ... */}
</section>
```

The blobs (`AnimatedBlobs`) are rendered in `page.js` with `position: fixed` and a low z-index — they will appear above the video automatically.

- [ ] **Step 3: Verify**

Run `npm run dev`. Open `http://localhost:3000`. The hero background should show the video playing. Text should be fully readable. The gradient overlay ensures contrast.

If `public/videos/hero.mp4` doesn't exist yet, a broken video element will be invisible — the hero will look the same as before (dark background). This is the correct fallback behavior.

- [ ] **Step 4: Commit**

```bash
git add fotobox/src/app/components/VideoBackground.jsx fotobox/src/app/components/HeroSection.jsx
git commit -m "feat: add video hero background with gradient overlay"
```

---

## Task 5: TextReveal component

**Files:**
- Create: `src/app/components/TextReveal.jsx`

- [ ] **Step 1: Create TextReveal.jsx**

```jsx
// src/app/components/TextReveal.jsx
"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/**
 * Film-style text reveal. Each item in `lines` slides up from hidden.
 * Props:
 *   lines    — string[]    — each string = one revealed line
 *   delay    — number      — base delay in seconds (default 0)
 *   className — string     — optional CSS class on wrapper
 *   style    — object      — optional inline style on wrapper
 */
export default function TextReveal({ lines, delay = 0, className, style }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <div ref={ref} className={className} style={style}>
      {lines.map((line, i) => (
        <div key={i} style={{ overflow: "hidden", lineHeight: "1.4" }}>
          <motion.span
            initial={{ y: "110%", opacity: 0 }}
            animate={isInView ? { y: "0%", opacity: 1 } : {}}
            transition={{
              delay: delay + i * 0.15,
              duration: 0.7,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{ display: "block" }}
          >
            {line}
          </motion.span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add fotobox/src/app/components/TextReveal.jsx
git commit -m "feat: add TextReveal film-style text animation component"
```

---

## Task 6: Apply TextReveal in HeroSection, FeaturesSection, and footer

**Files:**
- Modify: `src/app/components/HeroSection.jsx`
- Modify: `src/app/components/FeaturesSection.jsx`
- Modify: `src/app/page.js`

- [ ] **Step 1: Apply TextReveal to HeroSection subtitle**

In `src/app/components/HeroSection.jsx`, add the import and replace the `<motion.p>` subtitle with TextReveal:

```jsx
// Add import at top:
import TextReveal from "./TextReveal";

// Replace the <motion.p> subtitle (around line 85):
// DELETE:
// <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.5 }} style={{ ... }}>
//   Accédez à votre galerie privée en quelques secondes. Entrez le code reçu après votre séance.
// </motion.p>

// ADD:
<TextReveal
  lines={[
    "Accédez à votre galerie privée en quelques secondes.",
    "Entrez le code reçu après votre séance.",
  ]}
  delay={0.75}
  style={{
    fontSize: "15px", color: "var(--text-muted)",
    lineHeight: 1.8, maxWidth: "440px", marginBottom: "40px",
  }}
/>
```

The word-by-word title (`TITLE_WORDS` map) is kept as-is — it uses per-word gold color which TextReveal doesn't support.

- [ ] **Step 2: Add a heading to FeaturesSection and apply TextReveal**

In `src/app/components/FeaturesSection.jsx`, add import and a section heading before the grid:

```jsx
// Add import at top:
import TextReveal from "./TextReveal";

// Inside the <section>, before <div className="features-grid-inner">, add:
<TextReveal
  lines={["Ce que nous offrons"]}
  style={{
    fontSize: "clamp(28px, 3vw, 42px)",
    fontFamily: "var(--font-playfair)",
    fontStyle: "italic",
    color: "var(--text)",
    marginBottom: "48px",
  }}
/>
```

- [ ] **Step 3: Apply TextReveal to footer tagline**

In `src/app/page.js`, import TextReveal and replace the footer `<span>FOTOBOX</span>` with TextReveal:

```jsx
// Add import at top:
import TextReveal from "./components/TextReveal";

// Replace the second <span> in footer:
// DELETE:
// <span style={{ fontSize: "10px", letterSpacing: "3px", color: "#333", fontWeight: 700, fontFamily: "var(--font-playfair)" }}>
//   FOTOBOX
// </span>

// ADD:
<TextReveal
  lines={["FOTOBOX"]}
  style={{ fontSize: "10px", letterSpacing: "3px", color: "#333", fontWeight: 700, fontFamily: "var(--font-playfair)" }}
/>
```

- [ ] **Step 4: Verify**

Run `npm run dev`. Scroll down on the landing page. The subtitle should slide up line by line. The FeaturesSection heading should reveal when it enters the viewport. The footer "FOTOBOX" should reveal on scroll.

- [ ] **Step 5: Commit**

```bash
git add fotobox/src/app/components/HeroSection.jsx fotobox/src/app/components/FeaturesSection.jsx fotobox/src/app/page.js
git commit -m "feat: apply film-style text reveal to hero subtitle, features heading, footer"
```

---

## Task 7: Cinematic scroll — GSAP ScrollTrigger (HeroSection pin + parallax)

**Files:**
- Modify: `src/app/components/HeroSection.jsx`

- [ ] **Step 1: Add GSAP imports and refs to HeroSection**

In `src/app/components/HeroSection.jsx`, add the following at the top:

```jsx
// Add to existing imports:
import { useRef, useEffect } from "react";  // add useRef, useEffect (useState already there)
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
```

Add two refs inside the component (after the existing `const [showScroll, setShowScroll] = useState(true);`):

```jsx
const sectionRef = useRef(null);
const collageWrapRef = useRef(null);
```

- [ ] **Step 2: Attach sectionRef and collageWrapRef to the JSX**

In the `<section>` tag (line 30), add the ref:

```jsx
<section
  ref={sectionRef}   // ← ADD
  className="hero-section"
  style={{ display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}
>
```

In the `<motion.div className="hero-collage">` wrapper (around line 166), add the ref:

```jsx
<motion.div
  ref={collageWrapRef}   // ← ADD
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.3, duration: 0.6 }}
  className="hero-collage"
  style={{ flex: 0.9, display: "flex", justifyContent: "center", position: "relative", zIndex: 2 }}
>
```

- [ ] **Step 3: Add useEffect with GSAP ScrollTrigger**

Add this `useEffect` inside the component body, after the existing `useMotionValueEvent` block:

```jsx
useEffect(() => {
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  mm.add("(min-width: 768px)", () => {
    // Pin hero while next section scrolls up over it
    ScrollTrigger.create({
      trigger: sectionRef.current,
      pin: true,
      scrub: 1,
      end: "+=400",
    });

    // Subtle upward parallax on the photo collage
    gsap.to(collageWrapRef.current, {
      y: -40,
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  });

  return () => mm.revert();
}, []);
```

- [ ] **Step 4: Verify**

Run `npm run dev`. Scroll down on the landing page — the hero should stay pinned as the FeaturesSection slides up over it, then unpin after the scroll distance. The photo collage should move upward slightly as you scroll. On mobile (resize to < 768px), this should not occur.

- [ ] **Step 5: Commit**

```bash
git add fotobox/src/app/components/HeroSection.jsx
git commit -m "feat: add GSAP ScrollTrigger hero pin and collage parallax"
```

---

## Task 8: Cinematic scroll — FeaturesSection GSAP card parallax

**Files:**
- Modify: `src/app/components/FeaturesSection.jsx`

- [ ] **Step 1: Add GSAP imports and card refs to FeaturesSection**

In `src/app/components/FeaturesSection.jsx`, add:

```jsx
// Add to existing imports:
import { useRef, useEffect } from "react";  // add useEffect (useRef already there)
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
```

Inside the component, add a ref array for the cards (after the existing `const ref` and `isInView`):

```jsx
const cardRefs = useRef([]);
```

- [ ] **Step 2: Attach cardRefs to each feature card**

In the `.map()`, update the `<motion.div>` to also set the ref:

```jsx
{FEATURES.map((f, i) => (
  <motion.div
    key={f.num}
    ref={(el) => { cardRefs.current[i] = el; }}   // ← ADD
    initial={{ opacity: 0, y: 40 }}
    animate={isInView ? { opacity: 1, y: 0 } : {}}
    transition={{ delay: i * 0.15, duration: 0.5 }}
    style={{ display: "flex", flexDirection: "column", gap: "16px" }}
  >
```

- [ ] **Step 3: Add GSAP useEffect for card parallax**

Add this after the existing refs (before the return):

```jsx
useEffect(() => {
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add("(min-width: 768px)", () => {
    cardRefs.current.forEach((card) => {
      if (!card) return;
      gsap.fromTo(
        card,
        { y: 60 },
        {
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top bottom",
            end: "top center",
            scrub: 0.5,
          },
        }
      );
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  });

  return () => mm.revert();
}, []);
```

- [ ] **Step 4: Verify**

Scroll through the FeaturesSection. Each card should slide in from below as it enters the viewport (parallax feel, scrubbed to scroll position). On mobile this is disabled.

- [ ] **Step 5: Commit**

```bash
git add fotobox/src/app/components/FeaturesSection.jsx
git commit -m "feat: add GSAP ScrollTrigger parallax on feature cards"
```

---

## Task 9: CinematicCursor + reactive light field

**Files:**
- Create: `src/app/components/CinematicCursor.jsx`
- Modify: `src/app/components/ClientLayout.jsx`

- [ ] **Step 1: Create CinematicCursor.jsx**

```jsx
// src/app/components/CinematicCursor.jsx
"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CinematicCursor() {
  const [mounted, setMounted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [cursorState, setCursorState] = useState("default"); // "default" | "hover" | "click"

  // Cursor position (fast spring)
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const cursorX = useSpring(mouseX, { stiffness: 500, damping: 30 });
  const cursorY = useSpring(mouseY, { stiffness: 500, damping: 30 });

  // Light field position (slow spring — lags behind)
  const lightRawX = useMotionValue(-300);
  const lightRawY = useMotionValue(-300);
  const lightX = useSpring(lightRawX, { stiffness: 80, damping: 20 });
  const lightY = useSpring(lightRawY, { stiffness: 80, damping: 20 });

  useEffect(() => {
    setMounted(true);
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);

    const onMove = (e) => {
      mouseX.set(e.clientX - 20);  // center 40px cursor
      mouseY.set(e.clientY - 20);
      lightRawX.set(e.clientX - 200);  // center 400px light field
      lightRawY.set(e.clientY - 200);
    };

    const onOver = (e) => {
      if (e.target.closest('a, button, [data-cursor="pointer"]')) {
        setCursorState("hover");
      } else {
        setCursorState("default");
      }
    };

    const onDown = () => setCursorState("click");
    const onUp = () => setCursorState("default");

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    document.body.style.cursor = "none";

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
  }, [mouseX, mouseY, lightRawX, lightRawY]);

  if (!mounted || isTouch) return null;

  // Aperture inner radius: larger = more open
  const innerR = cursorState === "click" ? 17 : cursorState === "hover" ? 3 : 8;
  const cursorScale = cursorState === "hover" ? 1.4 : 1;
  const lightOpacity = cursorState === "hover" ? 0.18 : 0.08;
  const lightScale = cursorState === "hover" ? 1.5 : 1;

  return (
    <>
      {/* Aperture cursor */}
      <motion.div
        style={{
          position: "fixed",
          left: cursorX,
          top: cursorY,
          width: 40,
          height: 40,
          pointerEvents: "none",
          zIndex: 99999,
        }}
        animate={{ scale: cursorScale }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <svg viewBox="0 0 40 40" width="40" height="40">
          <defs>
            <mask id="cinematic-aperture-mask">
              <rect width="40" height="40" fill="white" />
              {/* Center hole — grows when open, shrinks when closed */}
              <motion.circle
                cx="20"
                cy="20"
                animate={{ r: innerR }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                fill="black"
              />
            </mask>
          </defs>

          {/* White iris disc, masked to show aperture blades */}
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="rgba(255,255,255,0.88)"
            mask="url(#cinematic-aperture-mask)"
          />

          {/* 8 blade-divider lines radiating from center */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1="20"
              y1="20"
              x2={20 + 18 * Math.cos((i * Math.PI) / 4)}
              y2={20 + 18 * Math.sin((i * Math.PI) / 4)}
              stroke="rgba(0,0,0,0.18)"
              strokeWidth="0.6"
            />
          ))}

          {/* Gold outer ring */}
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="#c9a84c"
            strokeWidth="1"
            opacity="0.85"
          />

          {/* Center dot */}
          <circle cx="20" cy="20" r="1.5" fill="white" />
        </svg>
      </motion.div>

      {/* Reactive light field (studio spotlight) */}
      <motion.div
        style={{
          position: "fixed",
          left: lightX,
          top: lightY,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,1) 0%, transparent 70%)",
          mixBlendMode: "screen",
          pointerEvents: "none",
          zIndex: 99998,
          willChange: "transform",
          transformOrigin: "50% 50%",
        }}
        animate={{ opacity: lightOpacity, scale: lightScale }}
        transition={{ type: "spring", stiffness: 150, damping: 20 }}
      />
    </>
  );
}
```

- [ ] **Step 2: Replace placeholder in ClientLayout.jsx**

Open `src/app/components/ClientLayout.jsx` and replace the placeholder import with the real one:

```jsx
// src/app/components/ClientLayout.jsx
"use client";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import CinematicCursor from "./CinematicCursor";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  return (
    <>
      <CinematicCursor />
      <AnimatePresence mode="wait" initial={false}>
        <div key={pathname} style={{ minHeight: "100vh" }}>
          {children}
        </div>
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 3: Verify**

Run `npm run dev`. Move the mouse around — the aperture cursor should follow. Hover over links/buttons — the aperture should close to a small dot and the cursor should grow. Click — the aperture should briefly open wide. The light field should glow behind the cursor with a slight lag. On a touch device (or mobile viewport with touch simulation), the cursor should be hidden.

- [ ] **Step 4: Commit**

```bash
git add fotobox/src/app/components/CinematicCursor.jsx fotobox/src/app/components/ClientLayout.jsx
git commit -m "feat: add aperture cursor and reactive light field"
```

---

## Task 10: SectionMorphDivider

**Files:**
- Create: `src/app/components/SectionMorphDivider.jsx`
- Modify: `src/app/page.js`

- [ ] **Step 1: Create SectionMorphDivider.jsx**

This component cross-fades between a wave shape and a diagonal cut as the user scrolls, creating a morphing divider effect using free GSAP (no MorphSVGPlugin required).

```jsx
// src/app/components/SectionMorphDivider.jsx
"use client";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function SectionMorphDivider({ fillColor = "#0a0a0a" }) {
  const containerRef = useRef(null);
  const waveRef = useRef(null);
  const diagonalRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px)", () => {
      // Wave fades out as you scroll into it
      gsap.fromTo(
        waveRef.current,
        { opacity: 1 },
        {
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "center center",
            scrub: true,
          },
        }
      );
      // Diagonal fades in simultaneously
      gsap.fromTo(
        diagonalRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "center center",
            scrub: true,
          },
        }
      );

      return () => ScrollTrigger.getAll().forEach((t) => t.kill());
    });

    return () => mm.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", height: 120, overflow: "hidden", marginTop: "-1px" }}
    >
      {/* Wave shape */}
      <svg
        ref={waveRef}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <path
          d="M 0 60 C 360 0 720 120 1080 60 C 1260 30 1380 80 1440 60 L 1440 120 L 0 120 Z"
          fill={fillColor}
        />
      </svg>

      {/* Diagonal cut */}
      <svg
        ref={diagonalRef}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0 }}
      >
        <path d="M 0 120 L 1440 0 L 1440 120 Z" fill={fillColor} />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Add SectionMorphDivider to page.js**

In `src/app/page.js`, import the component and insert it between `<HeroSection />` and `<FeaturesSection />`:

```jsx
// Add import at top:
import SectionMorphDivider from "./components/SectionMorphDivider";

// In the JSX, between HeroSection and FeaturesSection:
<HeroSection />
<SectionMorphDivider fillColor="#0a0a0a" />
<FeaturesSection />

// Also add a static footer divider after FeaturesSection (before <footer>):
<SectionMorphDivider fillColor="#0a0a0a" />
<footer style={{ ... }}>
```

The `fillColor` `#0a0a0a` matches `var(--dark)` which is the page background. Adjust if needed by inspecting the actual CSS variable value.

- [ ] **Step 3: Verify**

Scroll through the page. The divider between HeroSection and FeaturesSection should transition from a wave shape to a diagonal cut as you scroll into it. On mobile it's static.

- [ ] **Step 4: Commit**

```bash
git add fotobox/src/app/components/SectionMorphDivider.jsx fotobox/src/app/page.js
git commit -m "feat: add section morph divider with wave-to-diagonal scroll animation"
```

---

## Task 11: Dashboard animations (stagger, modals, toast, upload progress)

**Files:**
- Modify: `src/app/admin/dashboard/page.js`

`motion` and `AnimatePresence` were already imported in Task 3 Step 4. This task adds the actual animation usage.

- [ ] **Step 1: Animate recent session cards with stagger**

Find the `recentSessions.map(s => ...)` block (around line 287). Replace `<div className="session-row">` with `<motion.div>`:

```jsx
recentSessions.map((s, i) => (
  <motion.div
    className="session-row"
    key={s.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.85 }}
    transition={{ delay: i * 0.05, duration: 0.35 }}
  >
    {/* existing content unchanged */}
  </motion.div>
))
```

Do the same for `allSessions.map(s => ...)` (around line 324):

```jsx
allSessions.map((s, i) => (
  <motion.div
    className="session-row"
    key={s.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.85 }}
    transition={{ delay: i * 0.05, duration: 0.35 }}
  >
    {/* existing content unchanged */}
  </motion.div>
))
```

Wrap both session lists with `<AnimatePresence>` so exit animations play when sessions are deleted:

```jsx
// Around the sessions-list divs:
<div className="sessions-list">
  <AnimatePresence>
    {recentSessions.map((s, i) => (
      <motion.div ... key={s.id}>
        {/* ... */}
      </motion.div>
    ))}
  </AnimatePresence>
</div>
```

- [ ] **Step 2: Animate modals with AnimatePresence**

Find the CREATE MODAL section (around line 508). Wrap the condition with `AnimatePresence` and replace the outer div with `motion.div`:

```jsx
{/* CREATE MODAL */}
<AnimatePresence>
  {isCreateModalOpen && (
    <motion.div
      className="modal-overlay open"
      key="create-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="modal glass-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* existing modal content unchanged */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

Apply the same pattern to the remaining 3 modals. Each follows this exact structure — only the key and condition change:

```jsx
{/* CODE MODAL */}
<AnimatePresence>
  {isCodeModalOpen && (
    <motion.div className="modal-overlay open" key="code-modal"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <motion.div className="modal glass-card" style={{ maxWidth: "440px", textAlign: "center" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25, ease: "easeOut" }}>
        {/* keep existing inner content exactly as-is */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

{/* EDIT USER MODAL */}
<AnimatePresence>
  {userToEdit && (
    <motion.div className="modal-overlay open" key="edit-modal"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <motion.div className="modal glass-card" style={{ maxWidth: "400px" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25, ease: "easeOut" }}>
        {/* keep existing inner content exactly as-is */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

{/* UPLOAD MODAL */}
<AnimatePresence>
  {isUploadModalOpen && (
    <motion.div className="modal-overlay open" key="upload-modal"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <motion.div style={{ display: "contents" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25, ease: "easeOut" }}>
        <UploadModal
          sessionCode={currentSessionCode}
          sessionId={sessionDetail?.id}
          onClose={() => { setIsUploadModalOpen(false); loadSessionDetail(currentSessionCode); }}
          supabase={supabase}
          showToast={showToast}
        />
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 3: Animate toast**

Find the toast block (around line 618):

```jsx
{toast && (
  <div className="toast-container">
    <div className={`toast toast-${toast.type} show`}>{toast.msg}</div>
  </div>
)}
```

Replace with:

```jsx
<AnimatePresence>
  {toast && (
    <motion.div
      key="toast"
      className="toast-container"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className={`toast toast-${toast.type} show`}>{toast.msg}</div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 4: Add whileHover / whileTap to primary action buttons**

Find the main action buttons (`.btn-primary` rendered as `<button>` elements, not links). Add whileHover and whileTap:

```jsx
// Example: "Nouvelle séance" button (around line 258):
<motion.button
  className="btn-primary"
  onClick={() => setIsCreateModalOpen(true)}
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 400, damping: 20 }}
>
  ✦ Nouvelle séance
</motion.button>
```

Apply to: the two "✦ Nouvelle séance" `<button>` elements (one in dashboard view ~line 258, one in sessions view ~line 314). Also apply to the "➕ Ajouter des photos" button in the session-detail view (~line 359):

```jsx
<motion.button
  className="btn-primary"
  onClick={() => setIsUploadModalOpen(true)}
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 400, damping: 20 }}
>
  ➕ Ajouter des photos
</motion.button>
```

- [ ] **Step 5: Animate upload progress bar in UploadModal**

In the `UploadModal` function (around line 652), after importing motion at the top of the file, add an animated progress indicator below the upload zone. In the `{files.length > 0 && ...}` block, add a progress bar that tracks the ratio of done/error files:

```jsx
{/* Add after the grid of file previews */}
{uploading && (
  <div style={{ marginTop: "12px", height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
    <motion.div
      style={{
        height: "100%",
        borderRadius: "2px",
        background: "linear-gradient(90deg, var(--gold), rgba(201,168,76,0.5))",
        transformOrigin: "left center",
      }}
      animate={{
        scaleX: Object.values(fileProgress).filter(v => v === "done" || v === "error").length / files.length,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    />
  </div>
)}
```

- [ ] **Step 6: Verify**

Run `npm run dev`. Go to `/admin/dashboard`. Confirm:
- Session cards appear with staggered fade-in
- "Nouvelle séance" button animates on hover/tap
- Opening the create modal triggers a scale-in animation
- Closing it triggers scale-out
- Toast slides in from the right and slides out on dismiss
- During upload, the progress bar fills as files complete

- [ ] **Step 7: Commit**

```bash
git add fotobox/src/app/admin/dashboard/page.js
git commit -m "feat: add dashboard functional animations (stagger, modals, toast, progress bar)"
```

---

## Task 12: CSS — cursor:none on body + mobile overrides

**Files:**
- Modify: `public/css/style.css`

- [ ] **Step 1: Add cursor rules to style.css**

Open `public/css/style.css` and add at the end of the file:

```css
/* ── Cinematic cursor ────────────────────────────────── */
/* cursor:none is set dynamically by CinematicCursor.jsx via JS */
/* This ensures no flicker on elements that override cursor */
@media (pointer: fine) {
  a, button, [data-cursor="pointer"] {
    cursor: none !important;
  }
}

/* On touch devices, restore native cursor */
@media (pointer: coarse) {
  body {
    cursor: auto !important;
  }
  a, button {
    cursor: pointer !important;
  }
}
```

- [ ] **Step 2: Verify**

Run `npm run dev`. On desktop, no default cursor should appear anywhere (all cursor behavior handled by CinematicCursor). On a mobile device or touch simulator, the native cursor/tap behavior should be unchanged.

- [ ] **Step 3: Final smoke test**

Check each page:
- `/` — video hero, text reveal, aperture cursor, light field, wave-to-diagonal divider, hero pin
- `/client/CODE` — page transition, cursor active
- `/admin/login` — page transition, cursor active
- `/admin/dashboard` — page transition, cursor active, stagger cards, animated modals and toast

- [ ] **Step 4: Commit**

```bash
git add fotobox/public/css/style.css
git commit -m "feat: add cursor:none CSS rules for cinematic cursor on desktop"
```

---

## Post-implementation note

After completing all tasks, remind the user to:
1. Place `hero.mp4` at `fotobox/public/videos/hero.mp4` if not done yet
2. Execute `docs/security-rls-fix.sql` in the Supabase SQL Editor (from the previous security session)
3. Deploy to Vercel: `vercel --prod` or push to `main` if CI is configured
