// src/app/components/TextReveal.jsx
"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/**
 * Film-style text reveal. Each item in `lines` slides up from hidden.
 * Props:
 *   lines    — string[]    — each string = one revealed line
 *   delay    — number      — base delay in seconds (default 0)
 *   className — string     — optional CSS class on wrapper
 *   style    — object      — optional inline style on wrapper
 */
export default function TextReveal({ lines, delay = 0, className, style }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <div ref={ref} className={className} style={style}>
      {lines.map((line, i) => (
        <div key={i} style={{ overflow: "hidden", lineHeight: "1.4" }}>
          <motion.span
            initial={{ y: "110%", opacity: 0 }}
            animate={isInView ? { y: "0%", opacity: 1 } : {}}
            transition={{
              delay: delay + i * 0.15,
              duration: 0.7,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{ display: "block" }}
          >
            {line}
          </motion.span>
        </div>
      ))}
    </div>
  );
}
