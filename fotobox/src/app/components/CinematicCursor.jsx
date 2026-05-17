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
