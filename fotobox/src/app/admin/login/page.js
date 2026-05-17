"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import Link from "next/link";
import PageTransition from "@/app/components/PageTransition";

export default function AdminLogin() {
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPassConfirm, setRegPassConfirm] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/admin/dashboard");
      }
    };
    checkUser();
  }, [router, supabase]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 3000);
  };

  const doLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPass,
    });

    if (error) {
      showError("Identifiant ou mot de passe incorrect.");
      setLoading(false);
    } else {
      showToast("Connexion réussie !");
      setTimeout(() => router.push("/admin/dashboard"), 600);
    }
  };

  const doRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (regPass !== regPassConfirm) {
      showError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPass,
      options: {
        data: {
          name: regName,
        },
      },
    });

    if (error) {
      showError(error.message || "Erreur lors de l'inscription.");
      setLoading(false);
    } else if (data?.user && !data?.session) {
      // Si la confirmation d'email est activée dans Supabase
      showToast("Veuillez vérifier votre boîte de réception pour confirmer votre email.", "info");
      setTab("login");
      setLoginEmail(regEmail);
      setLoading(false);
    } else {
      showToast("Studio créé avec succès !");
      setTimeout(() => router.push("/admin/dashboard"), 600);
    }
  };

  const doGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/admin/dashboard`,
      },
    });
    if (error) {
      showError("Échec de la connexion avec Google.");
    }
  };

  return (
    <PageTransition>
    <main className="auth-page">
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="logo" style={{ justifyContent: "center", marginBottom: "15px", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <Image src="/images/logo.png" width={64} height={64} className="logo-img" alt="FotoBOX Logo" style={{ height: "64px", width: "64px" }} />
            <span className="dynamic-text" style={{ fontSize: "1.6rem" }}>FotoBOX</span>
          </div>
          <p>Espace Studio – Gérer vos séances</p>
        </div>

        <div className="auth-tabs" style={{ display: "flex", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={() => setTab("login")}
            className={`tab-btn ${tab === "login" ? "active" : ""}`}
            style={{ flex: 1, background: "none", border: "none", padding: "10px", cursor: "pointer", fontFamily: "var(--font-inter)", fontWeight: 600, color: tab === "login" ? "#fff" : "rgba(255,255,255,0.6)", borderBottom: `2px solid ${tab === "login" ? "var(--gold)" : "transparent"}` }}
          >
            Se connecter
          </button>
          <button
            onClick={() => setTab("register")}
            className={`tab-btn ${tab === "register" ? "active" : ""}`}
            style={{ flex: 1, background: "none", border: "none", padding: "10px", cursor: "pointer", fontFamily: "var(--font-inter)", fontWeight: 600, color: tab === "register" ? "#fff" : "rgba(255,255,255,0.6)", borderBottom: `2px solid ${tab === "register" ? "var(--gold)" : "transparent"}` }}
          >
            S'inscrire
          </button>
        </div>

        <div id="alertBox">
          {errorMsg && <div className="alert alert-error">⚠ {errorMsg}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "15px", flexDirection: "column", gap: "10px" }}>
          <button onClick={doGoogleLogin} className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
            Continuer avec Google
          </button>
        </div>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", marginBottom: "15px", fontSize: "14px" }}>— OU —</div>

        {tab === "login" ? (
          <form className="auth-form" onSubmit={doLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="loginUser">Email</label>
              <input type="email" id="loginUser" className="form-input" placeholder="ex: studio@gmail.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="loginPass">Mot de passe</label>
              <input type="password" id="loginPass" className="form-input" placeholder="••••••••" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
              <span>{loading ? "Connexion..." : "Se connecter"}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={doRegister}>
            <div className="form-group">
              <label className="form-label" htmlFor="regName">Nom du studio</label>
              <input type="text" id="regName" className="form-input" placeholder="ex: Jean Dupont" value={regName} onChange={(e) => setRegName(e.target.value)} required minLength="2" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="regUser">Email</label>
              <input type="email" id="regUser" className="form-input" placeholder="ex: jean@studio.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="regPass">Mot de passe</label>
              <input type="password" id="regPass" className="form-input" placeholder="••••••••" value={regPass} onChange={(e) => setRegPass(e.target.value)} required minLength="6" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="regPassConfirm">Confirmer le mot de passe</label>
              <input type="password" id="regPassConfirm" className="form-input" placeholder="••••••••" value={regPassConfirm} onChange={(e) => setRegPassConfirm(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", backgroundColor: "#2e8b57", borderColor: "#2e8b57" }} disabled={loading}>
              <span>{loading ? "Création..." : "Créer mon studio"}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
            </button>
          </form>
        )}

        <p className="auth-footer-link">
          <Link href="/">← Retour à l'accueil clients</Link>
        </p>
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type} show`}>{toast.msg}</div>
        </div>
      )}
    </main>
    </PageTransition>
  );
}
