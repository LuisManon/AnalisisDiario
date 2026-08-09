import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Loto Mas Lab",
  description: "Analisis local de resultados de Loto Mas"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
