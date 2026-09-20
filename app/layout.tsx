import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Loto Mas Lab",
  description: "Analisis local de resultados de Loto Mas",
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
