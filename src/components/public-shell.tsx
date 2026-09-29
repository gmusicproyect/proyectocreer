import Link from "next/link";
import { Brand } from "./brand";
import { CartLink } from "./cart-link";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="topline">MAIS QUE BRINDES. CONEXÕES.</div>
      <header className="public-header">
        <Brand />
        <nav aria-label="Navegação principal">
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/#sobre">Sobre a Creer</Link>
        </nav>
        <CartLink />
      </header>
      {children}
      <footer>
        <div className="footer-brand">
          <Brand />
          <p>Presentes que fortalecem conexões.</p>
        </div>
        <nav aria-label="Rodapé">
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/orcamento">Meu orçamento</Link>
          <Link href="/acesso">Área da equipe</Link>
        </nav>
        <span>© Creer · Brindes corporativos</span>
      </footer>
    </>
  );
}
