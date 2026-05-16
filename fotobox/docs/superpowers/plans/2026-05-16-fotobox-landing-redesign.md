# FotoBOX Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refaire la page d'accueil en style Magazine Narratif sombre avec animations Framer Motion (titre word-by-word, parallax collage photo, underline form, scroll-reveal features).

**Architecture:** `page.js` reste un Server Component qui compose 4 Client Components (`Navbar`, `HeroSection`, `FeaturesSection`) + `CodeForm` réécrit. `HeroSection` importe `CodeForm` et `PhotoCollage`. Chaque composant est isolé dans son propre fichier sous `src/app/components/`.

**Tech Stack:** Next.js 16 App Router, Framer Motion (déjà installé), CSS variables existantes (`--gold`, `--dark`, `--text-muted`, `--font-playfair`, `--font-inter`).

---

## Fichiers

| Action | Chemin |
|---|---|
| Réécrire | `src/app/page.js` |
| Réécrire | `src/app/components/CodeForm.jsx` |
| Créer | `src/app/components/Navbar.jsx` |
| Créer | `src/app/components/PhotoCollage.jsx` |
| Créer | `src/app/components/HeroSection.jsx` |
| Créer | `src/app/components/FeaturesSection.jsx` |

---

## Task 1 : CodeForm (underline style)

**Files:**
- Rewrite: `src/app/components/CodeForm.jsx`

La logique de soumission (getClientSession + router.push) est conservée. Seul le visuel change : un input unique caché capte la frappe, 6 slots visuels affichent les caractères avec des underlines animés en Framer Motion. Le label est retiré du composant (il sera dans HeroSection).

- [ ] **Step 1 : Réécrire CodeForm.jsx**

```jsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getClientSession } from "@/app/actions/admin";

export default function CodeForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  const handleChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(val);
    setError(false);
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (code.length < 6) return;
    setLoading(true);
    try {
      const result = await getClientSession(code);
      if (!result) { showError(); return; }
      if (result.isExpired) { showError("Séance expirée."); return; }
      router.push(`/client/${code}`);
    } catch {
      showError();
    } finally {
      setLoading(false);
    }
  };

  const showError = (msg = "Code invalide. Veuillez réessayer.") => {
    setError(msg);
    setTimeout(() => setError(false), 2500);
  };

  const slots = Array.from({ length: 6 }, (_, i) => code[i] ?? "");

  return (
    <form onSubmit={submitCode} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Slots visuels + input caché */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={code}
          onChange={handleChange}
          disabled={loading}
          autoComplete="off"
          style={{
            position: "absolute", inset: 0, opacity: 0,
            cursor: "text", width: "100%", fontSize: "1px", border: "none"
          }}
        />
        <div
          onClick={() => inputRef.current?.focus()}
          style={{ display: "flex", gap: "12px", cursor: "text" }}
        >
          {slots.map((char, i) => {
            const isFilled = i < code.length;
            const isActive = i === code.length && !loading;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", width: "36px" }}>
                <div style={{
                  fontSize: "22px", fontWeight: 600, height: "28px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: error ? "var(--danger)" : "var(--text)",
                  fontFamily: "var(--font-playfair)"
                }}>
                  {char}
                </div>
                <div style={{ position: "relative", width: "100%", height: "1px", background: "rgba(255,255,255,0.15)" }}>
                  {isFilled && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        position: "absolute", inset: 0,
                        background: error ? "var(--danger)" : "linear-gradient(90deg, var(--gold), var(--gold-light))",
                        boxShadow: error ? "none" : "0 0 8px rgba(201,168,76,0.5)",
                        transformOrigin: "left"
                      }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                      style={{
                        position: "absolute", inset: 0,
                        background: "var(--gold)",
                        boxShadow: "0 0 10px rgba(201,168,76,0.8)"
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ color: "var(--danger)", fontSize: "12px", margin: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={loading || code.length < 6}
        whileHover={{ scale: code.length === 6 && !loading ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        style={{
          display: "inline-flex", alignItems: "center", gap: "10px",
          background: "rgba(201,168,76,0.08)",
          border: "1px solid rgba(201,168,76,0.4)",
          color: "var(--gold)", fontSize: "11px", letterSpacing: "3px",
          textTransform: "uppercase", padding: "14px 28px", borderRadius: "3px",
          cursor: code.length < 6 ? "not-allowed" : "pointer",
          opacity: code.length < 6 ? 0.5 : 1,
          transition: "opacity 0.2s",
          fontFamily: "var(--font-inter)", width: "fit-content"
        }}
      >
        {loading ? "Vérification..." : "Accéder à ma galerie"} →
      </motion.button>
    </form>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
cd fotobox && npm run build
```

Résultat attendu : `✓ Compiled successfully` (ou `npm run dev` sans erreur dans la console).

- [ ] **Step 3 : Commit**

```bash
git add src/app/components/CodeForm.jsx
git commit -m "feat: rewrite CodeForm with underline style and Framer Motion"
```

---

## Task 2 : Navbar (scroll-aware, glassmorphism)

**Files:**
- Create: `src/app/components/Navbar.jsx`

- [ ] **Step 1 : Créer Navbar.jsx**

```jsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "56px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px",
        borderBottom: scrolled
          ? "1px solid rgba(201,168,76,0.2)"
          : "1px solid rgba(201,168,76,0.07)",
        background: scrolled
          ? "rgba(13,13,20,0.92)"
          : "rgba(13,13,20,0.6)",
        backdropFilter: "blur(20px)",
        transition: "background 0.3s, border-color 0.3s"
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
        <Image
          src="/images/logo.png"
          width={32} height={32}
          alt="FotoBOX"
          style={{ borderRadius: "6px", objectFit: "cover" }}
        />
        <span style={{
          fontFamily: "var(--font-playfair)", fontSize: "1.1rem",
          fontWeight: 700, color: "var(--gold)", letterSpacing: "2px"
        }}>
          FotoBOX
        </span>
      </Link>

      <nav style={{ display: "flex", alignItems: "center", gap: "28px" }}>
        <Link href="/" style={{
          fontSize: "11px", color: "var(--text-muted)",
          letterSpacing: "1px", textDecoration: "none"
        }}>
          Accueil
        </Link>
        <Link href="/admin/login" style={{
          fontSize: "10px", letterSpacing: "2px", color: "var(--gold)",
          border: "1px solid rgba(201,168,76,0.4)", borderRadius: "20px",
          padding: "6px 16px", textDecoration: "none"
        }}>
          Studio
        </Link>
      </nav>
    </motion.header>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npm run build
```

Résultat attendu : `✓ Compiled successfully`.

- [ ] **Step 3 : Commit**

```bash
git add src/app/components/Navbar.jsx
git commit -m "feat: add scroll-aware glassmorphism Navbar"
```

---

## Task 3 : PhotoCollage (spring entry + parallax souris)

**Files:**
- Create: `src/app/components/PhotoCollage.jsx`

Les 3 cartes tombent en place avec un spring au montage. Au survol du conteneur, elles pivotent légèrement en 3D (rotateX/rotateY) selon la position de la souris.

- [ ] **Step 1 : Créer PhotoCollage.jsx**

```jsx
"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const CARDS = [
  {
    style: { top: 70, right: 0, width: 175, height: 225, rotate: -5, zIndex: 1 },
    delay: 0.6,
    gradient: "linear-gradient(135deg,#101828,#1a2840)",
    border: "rgba(255,255,255,0.06)"
  },
  {
    style: { top: 10, left: 20, width: 205, height: 265, rotate: 3, zIndex: 3 },
    delay: 0.4,
    gradient: "linear-gradient(135deg,#3a2818,#5a4028)",
    border: "rgba(201,168,76,0.15)",
    badge: true
  },
  {
    style: { bottom: 10, right: 30, width: 160, height: 200, rotate: 1.5, zIndex: 2 },
    delay: 0.8,
    gradient: "linear-gradient(135deg,#281808,#3c2010)",
    border: "rgba(255,255,255,0.06)"
  },
];

export default function PhotoCollage() {
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-150, 150], [4, -4]), { stiffness: 80, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-150, 150], [-4, 4]), { stiffness: 80, damping: 20 });

  const handleMouseMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
      style={{ position: "relative", width: "380px", height: "440px", perspective: "800px" }}
    >
      <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d", width: "100%", height: "100%" }}>
        {CARDS.map((card, i) => (
          <motion.div
            key={i}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15, delay: card.delay }}
            style={{
              position: "absolute",
              ...card.style,
              background: card.gradient,
              borderRadius: "8px",
              border: `1px solid ${card.border}`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            {card.badge && (
              <div style={{
                position: "absolute", bottom: "12px", left: "12px", right: "12px",
                background: "rgba(10,11,14,0.85)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(201,168,76,0.2)",
                borderRadius: "4px", padding: "8px 12px",
                fontSize: "9px", color: "var(--gold)", letterSpacing: "1px"
              }}>
                ✓ Session prête · Vos photos vous attendent
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npm run build
```

- [ ] **Step 3 : Commit**

```bash
git add src/app/components/PhotoCollage.jsx
git commit -m "feat: add PhotoCollage with spring entry and mouse parallax"
```

---

## Task 4 : HeroSection (titre word-by-word + scroll indicator)

**Files:**
- Create: `src/app/components/HeroSection.jsx`

Importe `CodeForm` et `PhotoCollage`. Anime le titre mot par mot avec stagger. L'indicateur de scroll disparaît après 100px.

- [ ] **Step 1 : Créer HeroSection.jsx**

```jsx
"use client";

import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import CodeForm from "./CodeForm";
import PhotoCollage from "./PhotoCollage";

const TITLE_WORDS = [
  { word: "Vos", gold: false },
  { word: "photos", gold: false },
  { word: "vous", gold: false },
  { word: "attendent", gold: true },
];

export default function HeroSection() {
  const [showScroll, setShowScroll] = useState(true);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (val) => {
    setShowScroll(val < 100);
  });

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center",
      padding: "80px 60px 60px",
      position: "relative", overflow: "hidden"
    }}>
      {/* Chiffre 01 en filigrane */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -60%)",
        fontSize: "clamp(180px, 25vw, 320px)", fontWeight: 900,
        fontFamily: "var(--font-playfair)",
        color: "rgba(201,168,76,0.03)",
        lineHeight: 1, userSelect: "none", pointerEvents: "none"
      }}>
        01
      </div>

      {/* Ligne décorative verticale */}
      <div style={{
        position: "absolute", left: "60px", top: "100px", bottom: "80px", width: "1px",
        background: "linear-gradient(to bottom, transparent, rgba(201,168,76,0.3) 30%, rgba(201,168,76,0.3) 70%, transparent)"
      }} />

      {/* Contenu gauche */}
      <div style={{ flex: 1, position: "relative", zIndex: 2, maxWidth: "520px", paddingLeft: "28px" }}>

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}
        >
          <div style={{ width: "32px", height: "1px", background: "var(--gold)", flexShrink: 0 }} />
          <span style={{ fontSize: "10px", letterSpacing: "4px", color: "var(--gold)", textTransform: "uppercase" }}>
            Studio Photo
          </span>
        </motion.div>

        {/* Titre word-by-word */}
        <h1 style={{
          fontFamily: "var(--font-playfair)", fontSize: "clamp(36px, 4vw, 56px)",
          lineHeight: 1.15, fontStyle: "italic", marginBottom: "20px",
          display: "flex", flexWrap: "wrap", gap: "0 14px"
        }}>
          {TITLE_WORDS.map(({ word, gold }, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.1, duration: 0.45 }}
              style={{ color: gold ? "var(--gold)" : "var(--text)", display: "inline-block" }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* Sous-titre */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          style={{
            fontSize: "13px", color: "var(--text-muted)",
            lineHeight: 1.75, maxWidth: "380px", marginBottom: "40px"
          }}
        >
          Accédez à votre galerie privée en quelques secondes. Entrez le code reçu après votre séance.
        </motion.p>

        {/* Label + CodeForm */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.5 }}
        >
          <div style={{
            fontSize: "9px", letterSpacing: "3px", color: "#555",
            textTransform: "uppercase", marginBottom: "16px"
          }}>
            Votre code d'accès
          </div>
          <CodeForm />
        </motion.div>
      </div>

      {/* Collage photo droite — masqué sur mobile via .hero-collage CSS */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="hero-collage"
        style={{ flex: 0.9, display: "flex", justifyContent: "center", position: "relative", zIndex: 2 }}
      >
        <PhotoCollage />
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ opacity: showScroll ? 0.5 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "absolute", bottom: "30px", left: "50%",
          transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
          pointerEvents: "none"
        }}
      >
        <motion.div
          animate={{ scaleY: [0.8, 1, 0.8], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: "1px", height: "40px",
            background: "linear-gradient(to bottom, rgba(201,168,76,0.8), transparent)"
          }}
        />
        <span style={{ fontSize: "8px", letterSpacing: "3px", color: "var(--gold)", textTransform: "uppercase" }}>
          Scroll
        </span>
      </motion.div>
    </section>
  );
}
```

> **Note mobile :** Ajouter dans `src/app/globals.css` (ou `public/css/style.css`) :
> ```css
> @media (max-width: 768px) {
>   .hero-collage { display: none !important; }
> }
> ```
> Ceci masque le collage sur mobile. Le contenu gauche prend toute la largeur.

- [ ] **Step 2 : Ajouter la règle CSS mobile dans `public/css/style.css`**

À la fin du fichier, ajouter :

```css
/* ── Landing Redesign ── */
@media (max-width: 768px) {
  .hero-collage { display: none !important; }
}
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
npm run build
```

- [ ] **Step 4 : Commit**

```bash
git add src/app/components/HeroSection.jsx src/app/components/PhotoCollage.jsx public/css/style.css
git commit -m "feat: add animated HeroSection with word-by-word title and scroll indicator"
```

---

## Task 5 : FeaturesSection (scroll-reveal avec useInView)

**Files:**
- Create: `src/app/components/FeaturesSection.jsx`

- [ ] **Step 1 : Créer FeaturesSection.jsx**

```jsx
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const FEATURES = [
  {
    num: "01",
    title: "Accès Instantané",
    desc: "Vos photos disponibles dès la fin de séance, où que vous soyez dans le monde."
  },
  {
    num: "02",
    title: "Galerie Privée",
    desc: "Un code unique par séance. Seul vous pouvez accéder à vos souvenirs."
  },
  {
    num: "03",
    title: "Téléchargement HD",
    desc: "Téléchargez vos photos en haute qualité, une à une ou en lot en un clic."
  },
];

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      ref={ref}
      style={{
        padding: "100px 60px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        position: "relative"
      }}
    >
      {/* Ligne décorative verticale */}
      <div style={{
        position: "absolute", left: "60px", top: 0, bottom: 0, width: "1px",
        background: "linear-gradient(to bottom, transparent, rgba(201,168,76,0.15) 30%, rgba(201,168,76,0.15) 70%, transparent)"
      }} />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "60px",
        paddingLeft: "28px"
      }}>
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.num}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div style={{
              fontSize: "11px", letterSpacing: "3px",
              color: "rgba(201,168,76,0.4)",
              fontFamily: "var(--font-playfair)"
            }}>
              {f.num}
            </div>
            <div style={{
              width: "32px", height: "1px",
              background: "linear-gradient(90deg, var(--gold), transparent)"
            }} />
            <div style={{
              fontSize: "18px", fontFamily: "var(--font-playfair)",
              color: "var(--text)", fontStyle: "italic"
            }}>
              {f.title}
            </div>
            <div style={{
              fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.75
            }}>
              {f.desc}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npm run build
```

- [ ] **Step 3 : Commit**

```bash
git add src/app/components/FeaturesSection.jsx
git commit -m "feat: add FeaturesSection with scroll-reveal stagger animations"
```

---

## Task 6 : page.js — assemblage final

**Files:**
- Rewrite: `src/app/page.js`

- [ ] **Step 1 : Réécrire page.js**

```jsx
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";

export default function Home() {
  return (
    <main style={{ background: "var(--dark)", minHeight: "100vh", overflowX: "hidden" }}>
      {/* Bokeh blobs existants */}
      <div className="bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

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
  );
}
```

- [ ] **Step 2 : Build final**

```bash
npm run build
```

Résultat attendu : `✓ Compiled successfully` sans erreurs ni warnings.

- [ ] **Step 3 : Test visuel dev**

```bash
npm run dev
```

Ouvrir `http://localhost:3000` et vérifier :
- [ ] La navbar apparaît avec un fade-in depuis le haut
- [ ] Le titre s'anime mot par mot (Vos → photos → vous → **attendent** en doré)
- [ ] Les 3 cartes tombent en place en spring (décalées)
- [ ] Survoler le collage photo produit un léger effet 3D
- [ ] L'underline doré s'anime à chaque touche dans le formulaire
- [ ] Le curseur clignote sur le slot actif
- [ ] L'indicateur scroll disparaît après avoir scrollé
- [ ] La section features slide-up au scroll
- [ ] Sur mobile (< 768px) : le collage est caché, le texte prend toute la largeur

- [ ] **Step 4 : Commit final**

```bash
git add src/app/page.js
git commit -m "feat: complete landing page redesign - magazine narratif style with Framer Motion"
```
