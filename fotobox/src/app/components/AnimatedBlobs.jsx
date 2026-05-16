"use client";

import { motion } from "framer-motion";

// Durée d'un cycle complet en secondes
const CYCLE = 26;

// Keyframes blob 1 (coin haut-gauche, or/violet)
// Repos → dérive → approche → fusion → fusion-pulse → séparation → repos
const B1_X = [0, 20, 60, 420, 460, 420, 60, 20, 0];
const B1_Y = [0, 15, 40, 310, 340, 310, 40, 15, 0];
const B1_S = [1, 1.02, 1.05, 1.2, 1.38, 1.2, 1.05, 1.02, 1];
const B1_O = [0.32, 0.34, 0.36, 0.46, 0.58, 0.46, 0.36, 0.34, 0.32];

// Keyframes blob 2 (coin bas-droit, violet/bleu) — légèrement décalé
const B2_X = [0, -18, -55, -400, -440, -400, -55, -18, 0];
const B2_Y = [0, -12, -38, -295, -325, -295, -38, -12, 0];
const B2_S = [1, 1.02, 1.05, 1.18, 1.32, 1.18, 1.05, 1.02, 1];
const B2_O = [0.32, 0.33, 0.35, 0.44, 0.55, 0.44, 0.35, 0.33, 0.32];

// Keyframes blob 3 (centre, réactif à la fusion)
const B3_S = [0.7, 0.72, 0.78, 1.4, 2.0, 1.4, 0.78, 0.72, 0.7];
const B3_O = [0.08, 0.09, 0.1, 0.3, 0.52, 0.3, 0.1, 0.09, 0.08];
const B3_R = [0, 15, 30, 80, 110, 80, 30, 15, 0];

// Points de temps : repos long → accélération → fusion → repos long
const TIMES = [0, 0.06, 0.14, 0.4, 0.5, 0.6, 0.86, 0.94, 1];

const baseTransition = {
  duration: CYCLE,
  times: TIMES,
  repeat: Infinity,
  ease: "easeInOut",
};

export default function AnimatedBlobs() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0,
      pointerEvents: "none", overflow: "hidden"
    }}>
      {/* Blob 1 — haut-gauche, or → violet */}
      <motion.div
        animate={{ x: B1_X, y: B1_Y, scale: B1_S, opacity: B1_O }}
        transition={baseTransition}
        style={{
          position: "absolute",
          width: 620, height: 620,
          borderRadius: "50%",
          background: "radial-gradient(circle, #c9a84c 0%, #6b3fa0 60%, transparent 80%)",
          filter: "blur(88px)",
          top: -110, left: -160,
        }}
      />

      {/* Blob 2 — bas-droit, violet → bleu — 2s de décalage pour effet organique */}
      <motion.div
        animate={{ x: B2_X, y: B2_Y, scale: B2_S, opacity: B2_O }}
        transition={{ ...baseTransition, delay: 2 }}
        style={{
          position: "absolute",
          width: 520, height: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle, #6b3fa0 0%, #1a5fc0 60%, transparent 80%)",
          filter: "blur(88px)",
          bottom: -90, right: -130,
        }}
      />

      {/* Blob 3 — centre, pulse réactif à la rencontre */}
      <motion.div
        animate={{ scale: B3_S, opacity: B3_O, rotate: B3_R }}
        transition={baseTransition}
        style={{
          position: "absolute",
          width: 380, height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,168,76,0.5) 0%, rgba(90,247,184,0.15) 50%, transparent 75%)",
          filter: "blur(75px)",
          top: "42%", left: "42%",
          transform: "translate(-50%,-50%)",
          transformOrigin: "center",
        }}
      />

      {/* Blob 4 — halo de fusion, visible uniquement pendant la rencontre */}
      <motion.div
        animate={{
          scale: [0, 0, 0.1, 1.4, 1.8, 1.4, 0.1, 0, 0],
          opacity: [0, 0, 0.02, 0.18, 0.28, 0.18, 0.02, 0, 0],
        }}
        transition={{ ...baseTransition }}
        style={{
          position: "absolute",
          width: 700, height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,168,76,0.8) 0%, rgba(107,63,160,0.4) 40%, transparent 70%)",
          filter: "blur(60px)",
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
        }}
      />
    </div>
  );
}
