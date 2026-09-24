import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Creer | Presentes com propósito", template: "%s | Creer" },
  description:
    "Brindes corporativos que aproximam pessoas. Conheça o catálogo Creer e prepare seu orçamento.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip" href="#conteudo">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
