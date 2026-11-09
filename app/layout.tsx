import type { Metadata } from "next";
import "./styles.css";
import "./analysis-workspace.css";
import "./loto-top-five.css";
import "./loto-analysis-maps.css";
import "./dashboard-refinement.css";
import "./product-details.css";

export const metadata: Metadata = {
  title: "Análisis Diario",
  description: "Análisis de Super Kino TV, El Quinielón 2.0 y Loto Más",
  other: {
    google: "notranslate"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="notranslate" lang="es" translate="no">
      <body>{children}</body>
    </html>
  );
}
