"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getClientSession } from "@/app/actions/admin";

export default function CodeForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  const handleChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(val);
    setError(false);
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (code.length < 6) return;
    setLoading(true);
    try {
      const result = await getClientSession(code);
      if (!result) { showError(); return; }
      if (result.isExpired) { showError("Séance expirée."); return; }
      router.push(`/client/${code}`);
    } catch {
      showError();
    } finally {
      setLoading(false);
    }
  };

  const showError = (msg = "Code invalide. Veuillez réessayer.") => {
    setError(msg);
    setTimeout(() => setError(false), 2500);
  };

  const slots = Array.from({ length: 6 }, (_, i) => code[i] ?? "");

  return (
    <form onSubmit={submitCode} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={code}
          onChange={handleChange}
          disabled={loading}
          autoComplete="off"
          style={{
            position: "absolute", inset: 0, opacity: 0,
            cursor: "text", width: "100%", fontSize: "1px", border: "none"
          }}
        />
        <div
          className="code-slots"
          onClick={() => inputRef.current?.focus()}
        >
          {slots.map((char, i) => {
            const isFilled = i < code.length;
            const isActive = i === code.length && !loading;
            return (
              <div key={i} className="code-slot">
                <div style={{
                  fontSize: "28px", fontWeight: 600, height: "36px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: error ? "var(--danger)" : "var(--text)",
                  fontFamily: "var(--font-playfair)"
                }}>
                  {char}
                </div>
                <div style={{ position: "relative", width: "100%", height: "1px", background: "rgba(255,255,255,0.15)" }}>
                  {isFilled && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        position: "absolute", inset: 0,
                        background: error ? "var(--danger)" : "linear-gradient(90deg, var(--gold), var(--gold-light))",
                        boxShadow: error ? "none" : "0 0 8px rgba(201,168,76,0.5)",
                        transformOrigin: "left"
                      }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                      style={{
                        position: "absolute", inset: 0,
                        background: "var(--gold)",
                        boxShadow: "0 0 10px rgba(201,168,76,0.8)"
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ color: "var(--danger)", fontSize: "12px", margin: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={loading || code.length < 6}
        whileHover={{ scale: code.length === 6 && !loading ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        style={{
          display: "inline-flex", alignItems: "center", gap: "10px",
          background: "rgba(201,168,76,0.08)",
          border: "1px solid rgba(201,168,76,0.4)",
          color: "var(--gold)", fontSize: "12px", letterSpacing: "3px",
          textTransform: "uppercase", padding: "16px 36px", borderRadius: "3px",
          cursor: code.length < 6 ? "not-allowed" : "pointer",
          opacity: code.length < 6 ? 0.5 : 1,
          transition: "opacity 0.2s",
          fontFamily: "var(--font-inter)", width: "fit-content"
        }}
      >
        {loading ? "Vérification..." : "Accéder à ma galerie"} →
      </motion.button>
    </form>
  );
}
