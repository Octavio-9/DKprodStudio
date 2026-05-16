import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";

export default function Home() {
  return (
    <main style={{ background: "var(--dark)", minHeight: "100vh", overflowX: "hidden" }}>
      {/* Bokeh blobs existants */}
      <div className="bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <Navbar />
      <HeroSection />
      <FeaturesSection />

      <footer style={{
        padding: "28px 60px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <span style={{ fontSize: "11px", color: "#444", letterSpacing: "1px" }}>
          © {new Date().getFullYear()} FotoBOX · Tous droits réservés
        </span>
        <span style={{
          fontSize: "10px", letterSpacing: "3px",
          color: "#333", fontWeight: 700,
          fontFamily: "var(--font-playfair)"
        }}>
          FOTOBOX
        </span>
      </footer>
    </main>
  );
}
