// src/app/layout.js
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "./components/ClientLayout";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "FotoBOX – Récupération de Photos",
  description: "Récupérez vos photos de séance en toute simplicité.",
  icons: { icon: "/images/logo.png" },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <link rel="stylesheet" href="/css/style.css" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
