import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fuentes autoalojadas (licencia OFL, ver src/app/fonts). Sin llamadas a Google Fonts.
const display = localFont({
  src: [
    { path: "./fonts/fraunces-latin-opsz-normal.woff2", style: "normal" },
    { path: "./fonts/fraunces-latin-opsz-italic.woff2", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
});
const body = localFont({
  src: "./fonts/manrope-latin-wght-normal.woff2",
  variable: "--font-body",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});
export const metadata: Metadata = {
  title: { default: "Creer | Presentes com propósito", template: "%s | Creer" },
  description:
    "Brindes corporativos que aproximam pessoas. Conheça o catálogo Creer e prepare seu orçamento.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <a className="skip" href="#conteudo">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
