"use client";

export default function VideoBackground() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      zIndex: 0, overflow: "hidden",
      pointerEvents: "none",
    }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        src="/videos/hero.mp4"
        style={{
          width: "100%", height: "100%",
          objectFit: "cover", display: "block",
        }}
      />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%)",
      }} />
    </div>
  );
}
