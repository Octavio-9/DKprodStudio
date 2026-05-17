"use client";

import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import CodeForm from "./CodeForm";
import PhotoCollage from "./PhotoCollage";
import VideoBackground from "./VideoBackground";
import TextReveal from "./TextReveal";

const TITLE_WORDS = [
  { word: "Vos", gold: false },
  { word: "photos", gold: false },
  { word: "vous", gold: false },
  { word: "attendent", gold: true },
];

const MOBILE_CARDS = [
  { src: "/images/hero-1.png", rotate: -7, yOffset: 14, floatDur: 3.2, delay: 1.1 },
  { src: "/images/hero-2.png", rotate: 1,  yOffset: 0,  floatDur: 2.8, delay: 1.3, featured: true },
  { src: "/images/hero-3.png", rotate: 6,  yOffset: 18, floatDur: 3.6, delay: 1.2 },
];

export default function HeroSection() {
  const [showScroll, setShowScroll] = useState(true);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (val) => {
    setShowScroll(val < 100);
  });

  return (
    <section className="hero-section" style={{
      display: "flex", alignItems: "center",
      position: "relative", overflow: "hidden"
    }}>
      <VideoBackground />
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
      <div className="hero-deco-line" />

      {/* Contenu gauche */}
      <div className="hero-content-left" style={{ flex: 1, position: "relative", zIndex: 2 }}>

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
          fontFamily: "var(--font-playfair)", fontSize: "clamp(44px, 5.5vw, 76px)",
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

        {/* Strip photos — visible uniquement sur mobile via .hero-mobile-photos */}
        <div className="hero-mobile-photos">
          {MOBILE_CARDS.map((card, i) => (
            /* Enveloppe d'entrée */
            <motion.div
              key={i}
              initial={{ y: 55, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: card.delay, duration: 0.6, type: "spring", stiffness: 90, damping: 14 }}
            >
              {/* Enveloppe de flottement continu */}
              <motion.div
                animate={{ y: [card.yOffset, card.yOffset - 8, card.yOffset] }}
                transition={{ duration: card.floatDur, repeat: Infinity, ease: "easeInOut", delay: card.delay + 0.6 }}
                style={{
                  rotate: card.rotate,
                  width: card.featured ? 118 : 100,
                  height: card.featured ? 150 : 128,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: card.featured
                    ? "1px solid rgba(201,168,76,0.35)"
                    : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: card.featured
                    ? "0 16px 40px rgba(0,0,0,0.65), 0 0 20px rgba(201,168,76,0.1)"
                    : "0 12px 28px rgba(0,0,0,0.55)",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                <img
                  src={card.src}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {card.featured && (
                  <div style={{
                    position: "absolute", bottom: 8, left: 8, right: 8,
                    background: "rgba(10,11,14,0.82)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(201,168,76,0.2)",
                    borderRadius: 4, padding: "5px 8px",
                    fontSize: 8, color: "var(--gold)", letterSpacing: "0.5px"
                  }}>
                    ✓ Session prête
                  </div>
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>
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
