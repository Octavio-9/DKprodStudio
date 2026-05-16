"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="navbar-landing"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "56px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: scrolled
          ? "1px solid rgba(201,168,76,0.2)"
          : "1px solid rgba(201,168,76,0.07)",
        background: scrolled
          ? "rgba(13,13,20,0.92)"
          : "rgba(13,13,20,0.6)",
        backdropFilter: "blur(20px)",
        transition: "background 0.3s, border-color 0.3s"
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
        <Image
          src="/images/logo.png"
          width={32} height={32}
          alt="FotoBOX"
          style={{ borderRadius: "6px", objectFit: "cover" }}
        />
        <span style={{
          fontFamily: "var(--font-playfair)", fontSize: "1.1rem",
          fontWeight: 700, color: "var(--gold)", letterSpacing: "2px"
        }}>
          FotoBOX
        </span>
      </Link>

      <nav style={{ display: "flex", alignItems: "center", gap: "28px" }}>
        <Link href="/" style={{
          fontSize: "11px", color: "var(--text-muted)",
          letterSpacing: "1px", textDecoration: "none"
        }}>
          Accueil
        </Link>
        <Link href="/admin/login" style={{
          fontSize: "10px", letterSpacing: "2px", color: "var(--gold)",
          border: "1px solid rgba(201,168,76,0.4)", borderRadius: "20px",
          padding: "6px 16px", textDecoration: "none"
        }}>
          Studio
        </Link>
      </nav>
    </motion.header>
  );
}
