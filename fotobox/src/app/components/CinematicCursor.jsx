"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CinematicCursor() {
  const [mounted, setMounted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // Light field (slow lag)
  const lightRawX = useMotionValue(-300);
  const lightRawY = useMotionValue(-300);
  const lightX = useSpring(lightRawX, { stiffness: 80, damping: 20 });
  const lightY = useSpring(lightRawY, { stiffness: 80, damping: 20 });

  useEffect(() => {
    setMounted(true);
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);

    const onMove = (e) => {
      lightRawX.set(e.clientX - 200);
      lightRawY.set(e.clientY - 200);
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [lightRawX, lightRawY]);

  if (!mounted || isTouch) return null;

  return (
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
      }}
      animate={{ opacity: 0.07 }}
      transition={{ type: "spring", stiffness: 150, damping: 20 }}
    />
  );
}
