import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { RequestPasswordForm } from "@/modules/auth/password-forms";

export default async function Page({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <PublicShell><main id="conteudo" className="access">
    <p className="eyebrow">ÁREA DA EQUIPE</p>
    <h1>Crie sua senha.</h1>
    <p>Informe o e-mail da sua conta Creer. Você receberá um link seguro para criar ou recuperar sua senha.</p>
    {erro === "link" && <div className="form-error" role="alert">Este link está inválido ou expirou. Solicite outro abaixo.</div>}
    <RequestPasswordForm />
    <Link className="text-button" href="/acesso">Voltar ao acesso</Link>
  </main></PublicShell>;
}
