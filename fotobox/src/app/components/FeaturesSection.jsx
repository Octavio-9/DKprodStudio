"use client";

import { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TextReveal from "./TextReveal";

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
  const cardRefs = useRef([]);

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

  return (
    <section
      ref={ref}
      className="features-landing"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)", position: "relative" }}
    >
      {/* Ligne décorative verticale */}
      <div className="feat-deco-line" />

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

      <div className="features-grid-inner" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "60px"
      }}>
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.num}
            ref={(el) => { cardRefs.current[i] = el; }}
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
