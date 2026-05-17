// src/app/components/ClientLayout.jsx
"use client";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

// CinematicCursor imported in Task 9 — placeholder for now
function CinematicCursorPlaceholder() { return null; }

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  return (
    <>
      <CinematicCursorPlaceholder />
      <AnimatePresence mode="wait" initial={false}>
        <div key={pathname} style={{ minHeight: "100vh" }}>
          {children}
        </div>
      </AnimatePresence>
    </>
  );
}
