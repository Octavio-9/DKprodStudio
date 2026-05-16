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
      padding: "100px 72px 80px",
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
      <div style={{ flex: 1, position: "relative", zIndex: 2, maxWidth: "620px", paddingLeft: "36px" }}>

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
          fontFamily: "var(--font-playfair)", fontSize: "clamp(48px, 5.5vw, 76px)",
          lineHeight: 1.1, fontStyle: "italic", marginBottom: "24px",
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
            fontSize: "15px", color: "var(--text-muted)",
            lineHeight: 1.8, maxWidth: "440px", marginBottom: "48px"
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
