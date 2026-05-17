import PageTransition from "./components/PageTransition";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import AnimatedBlobs from "./components/AnimatedBlobs";
import TextReveal from "./components/TextReveal";
import SectionMorphDivider from "./components/SectionMorphDivider";

export default function Home() {
  return (
    <PageTransition>
    <main style={{ background: "var(--dark)", minHeight: "100vh", overflowX: "hidden" }}>
      <AnimatedBlobs />

      <Navbar />
      <HeroSection />
      <SectionMorphDivider fillColor="#0a0a0a" />
      <FeaturesSection />
      <SectionMorphDivider fillColor="#0a0a0a" />

      <footer style={{
        padding: "28px 60px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <span style={{ fontSize: "11px", color: "#444", letterSpacing: "1px" }}>
          © {new Date().getFullYear()} FotoBOX · Tous droits réservés
        </span>
        <TextReveal
          lines={["FOTOBOX"]}
          style={{ fontSize: "10px", letterSpacing: "3px", color: "#333", fontWeight: 700, fontFamily: "var(--font-playfair)" }}
        />
      </footer>
    </main>
    </PageTransition>
  );
}
