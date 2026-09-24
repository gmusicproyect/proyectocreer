import Link from "next/link";
export default function NotFound() {
  return (
    <main id="conteudo" className="access">
      <p className="eyebrow">404</p>
      <h1>Página não encontrada</h1>
      <p>Este endereço não está disponível.</p>
      <Link className="button" href="/">
        Voltar ao catálogo
      </Link>
    </main>
  );
}
