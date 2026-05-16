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