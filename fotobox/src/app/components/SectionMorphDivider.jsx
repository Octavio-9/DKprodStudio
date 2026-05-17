// src/app/components/SectionMorphDivider.jsx
"use client";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function SectionMorphDivider({ fillColor = "#0a0a0a" }) {
  const containerRef = useRef(null);
  const waveRef = useRef(null);
  const diagonalRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px)", () => {
      // Wave fades out as you scroll into it
      gsap.fromTo(
        waveRef.current,
        { opacity: 1 },
        {
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "center center",
            scrub: true,
          },
        }
      );
      // Diagonal fades in simultaneously
      gsap.fromTo(
        diagonalRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "center center",
            scrub: true,
          },
        }
      );

      return () => ScrollTrigger.getAll().forEach((t) => t.kill());
    });

    return () => mm.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", height: 120, overflow: "hidden", marginTop: "-1px" }}
    >
      {/* Wave shape */}
      <svg
        ref={waveRef}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <path
          d="M 0 60 C 360 0 720 120 1080 60 C 1260 30 1380 80 1440 60 L 1440 120 L 0 120 Z"
          fill={fillColor}
        />
      </svg>

      {/* Diagonal cut */}
      <svg
        ref={diagonalRef}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0 }}
      >
        <path d="M 0 120 L 1440 0 L 1440 120 Z" fill={fillColor} />
      </svg>
    </div>
  );
}
