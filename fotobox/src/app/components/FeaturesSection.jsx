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
        padding: "120px 72px",
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
              fontSize: "22px", fontFamily: "var(--font-playfair)",
              color: "var(--text)", fontStyle: "italic"
            }}>
              {f.title}
            </div>
            <div style={{
              fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.8
            }}>
              {f.desc}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
