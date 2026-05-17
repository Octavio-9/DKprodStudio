import { getClientSession } from "@/app/actions/admin";
import ClientGallery from "./ClientGallery";
import Link from "next/link";
import Image from "next/image";

export default async function ClientPage({ params }) {
  const { code } = await params;
  
  const result = await getClientSession(code);
  
  if (!result || result.isExpired) {
    const isExpired = result?.isExpired;
    return (
      <main className="client-page">
        {/* ... existing header and background blobs ... */}
        <div className="bg-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>
        <header className="main-header">
          <Link href="/" className="logo">
            <Image src="/images/logo.png" width={40} height={40} className="logo-img" alt="FotoBOX Logo" />
            <span className="dynamic-text">FotoBOX</span>
          </Link>
          <nav className="main-nav">
            <Link href="/" className="nav-link">Accueil</Link>
            <Link href="#" className="nav-link active">Mes Photos</Link>
            <Link href="/admin/login" className="nav-btn-outline">Studio</Link>
          </nav>
        </header>

        <div id="clientRoot" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 32px" }}>
            <div className="glass-card" style={{ padding: "48px", maxWidth: "420px", textAlign: "center", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ fontSize: "3rem" }}>🔐</div>
              <h2 style={{ fontFamily: "var(--font-playfair)" }}>Accès non autorisé</h2>
              <p style={{ color: "var(--text-muted)", fontSize: ".9rem" }}>
                {isExpired ? "Ce lien a expiré. Contactez le studio pour prolonger l'accès." : "Code invalide ou séance introuvable. Veuillez vérifier votre code."}
              </p>
              <Link href="/" className="btn-primary" style={{ textDecoration: "none", justifyContent: "center" }}>← Retour à l'accueil</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { session, photos } = result;

  return (
    <main className="client-page">
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      <header className="main-header">
        <Link href="/" className="logo">
          <Image src="/images/logo.png" width={40} height={40} className="logo-img" alt="FotoBOX Logo" />
          <span className="dynamic-text">FotoBOX</span>
        </Link>
        <nav className="main-nav">
          <Link href="/" className="nav-link">Accueil</Link>
          <Link href="#" className="nav-link active">Mes Photos</Link>
          <Link href="/admin/login" className="nav-btn-outline">Studio</Link>
        </nav>
      </header>

      <div id="clientRoot" style={{ position: "relative", zIndex: 1 }}>
        <ClientGallery session={session} initialPhotos={photos || []} />
      </div>
    </main>
  );
}
