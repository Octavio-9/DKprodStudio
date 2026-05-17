"use client";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import CinematicCursor from "./CinematicCursor";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  return (
    <>
      <CinematicCursor />
      <AnimatePresence mode="wait" initial={false}>
        <div key={pathname} style={{ minHeight: "100vh" }}>
          {children}
        </div>
      </AnimatePresence>
    </>
  );
}
