import type { Metadata, Viewport } from "next";
import "./styles.css";
import "./analysis-workspace.css";
import "./loto-top-five.css";
import "./loto-analysis-maps.css";
import "./dashboard-refinement.css";
import "./product-details.css";
import "./pwa.css";

export const metadata: Metadata = {
  title: "Análisis Diario",
  description: "Análisis de Super Kino TV, El Quinielón 2.0 y Loto Más",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Análisis Diario" },
  icons: { apple: [{ url: "/apple-icon.png?v=2", sizes: "180x180", type: "image/png" }], icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }] },
  other: {
    google: "notranslate",
    "apple-mobile-web-app-capable": "yes"
  }
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: "#f3f5f9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="notranslate" lang="es" translate="no">
      <body>{children}</body>
    </html>
  );
}
