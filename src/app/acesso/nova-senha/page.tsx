import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { NewPasswordForm } from "@/modules/auth/password-forms";

export default function Page() {
  return <PublicShell><main id="conteudo" className="access">
    <p className="eyebrow">ÁREA DA EQUIPE</p>
    <h1>Escolha sua senha.</h1>
    <p>Sua senha é pessoal. Depois de salvá-la, entre com seu e-mail e a nova senha.</p>
    <NewPasswordForm />
    <Link className="text-button" href="/acesso">Voltar ao acesso</Link>
  </main></PublicShell>;
}
