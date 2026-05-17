"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CinematicCursor() {
  const [mounted, setMounted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [cursorState, setCursorState] = useState("default"); // "default" | "hover" | "click"

  // Very snappy cursor tracking
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const cursorX = useSpring(mouseX, { stiffness: 900, damping: 40 });
  const cursorY = useSpring(mouseY, { stiffness: 900, damping: 40 });

  // Light field (slow lag)
  const lightRawX = useMotionValue(-300);
  const lightRawY = useMotionValue(-300);
  const lightX = useSpring(lightRawX, { stiffness: 80, damping: 20 });
  const lightY = useSpring(lightRawY, { stiffness: 80, damping: 20 });

  useEffect(() => {
    setMounted(true);
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);

    const onMove = (e) => {
      mouseX.set(e.clientX - 12); // center 24px cursor
      mouseY.set(e.clientY - 12);
      lightRawX.set(e.clientX - 200);
      lightRawY.set(e.clientY - 200);
    };

    const onOver = (e) => {
      if (e.target.closest('a, button, [data-cursor="pointer"]')) {
        setCursorState("hover");
      } else {
        setCursorState("default");
      }
    };

    const onDown = () => { if (cursorState === "hover") setCursorState("click"); };
    const onUp = () => setCursorState((prev) => prev === "click" ? "hover" : "default");

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

  const isHover = cursorState === "hover" || cursorState === "click";
  const innerR = cursorState === "click" ? 9 : 4; // aperture hole when active
  const lightOpacity = isHover ? 0.14 : 0.06;
  const lightScale = isHover ? 1.3 : 1;

  return (
    <>
      {/* Cursor — 24×24px */}
      <motion.div
        style={{
          position: "fixed",
          left: cursorX,
          top: cursorY,
          width: 24,
          height: 24,
          pointerEvents: "none",
          zIndex: 99999,
        }}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <defs>
            <mask id="aperture-mask">
              <rect width="24" height="24" fill="white" />
              <motion.circle
                cx="12" cy="12"
                animate={{ r: isHover ? innerR : 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                fill="black"
              />
            </mask>
          </defs>

          {/* Aperture blades — only visible on hover */}
          <motion.circle
            cx="12" cy="12" r="10"
            fill="rgba(255,255,255,0.85)"
            mask="url(#aperture-mask)"
            animate={{ opacity: isHover ? 1 : 0 }}
            transition={{ duration: 0.15 }}
          />

          {/* 8 blade dividers — only on hover */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.line
              key={i}
              x1="12" y1="12"
              x2={12 + 10 * Math.cos((i * Math.PI) / 4)}
              y2={12 + 10 * Math.sin((i * Math.PI) / 4)}
              stroke="rgba(0,0,0,0.18)"
              strokeWidth="0.5"
              animate={{ opacity: isHover ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            />
          ))}

          {/* Gold ring — always visible, brighter on hover */}
          <motion.circle
            cx="12" cy="12"
            fill="none"
            stroke="#c9a84c"
            strokeWidth="1.2"
            animate={{ opacity: isHover ? 0.95 : 0.75, r: isHover ? 10 : 7 }}
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
          />

          {/* Center dot — always visible */}
          <circle cx="12" cy="12" r="2.5" fill="white" />
        </svg>
      </motion.div>

      {/* Reactive light field */}
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
