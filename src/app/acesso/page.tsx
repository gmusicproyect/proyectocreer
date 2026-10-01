import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { login } from "@/modules/auth/actions";
import {
  getAdminAccess,
  isAdminPreviewEnabled,
} from "@/modules/auth/access";

const errorMessages: Record<string, string> = {
  configuracao: "A conexão com o ambiente seguro ainda não foi configurada.",
  campos: "Informe o e-mail e a senha.",
  credenciais: "E-mail ou senha inválidos.",
  acesso: "Sua conta ainda não possui acesso à equipe Creer.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; senha?: string }>;
}) {
  const configured = hasSupabaseConfig();
  if (configured && (await getAdminAccess())) redirect("/admin");

  const { erro, senha } = await searchParams;
  const errorMessage = erro ? errorMessages[erro] : null;

  return (
    <PublicShell>
      <main id="conteudo" className="access">
        <p className="eyebrow">ÁREA DA EQUIPE</p>
        <h1>Seu espaço de gestão.</h1>
        {configured ? (
          <>
            <p>Entre com o acesso enviado para a equipe Creer.</p>
            {senha === "atualizada" && <p role="status">Senha salva. Entre com sua nova senha.</p>}
            {errorMessage && (
              <div className="form-error" role="alert">
                {errorMessage}
              </div>
            )}
            <form action={login} className="login-form">
              <label className="field">
                <span>E-mail</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label className="field">
                <span>Senha</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="button wide" type="submit">
                Entrar na administração
              </button>
            </form>
            <Link className="text-button" href="/acesso/recuperar">
              Criar ou recuperar minha senha
            </Link>
          </>
        ) : (
          <>
            <p>
              A conexão segura está preparada no projeto. Falta vincular o
              ambiente Supabase para ativar usuários reais.
            </p>
            {isAdminPreviewEnabled() && (
              <div className="notice">
                <strong>Prévia local · sem dados reais</strong>
                <p>
                  Explore a estrutura e as solicitações salvas neste navegador.
                </p>
                <Link className="button" href="/admin">
                  Explorar prévia do painel
                </Link>
              </div>
            )}
          </>
        )}
        <Link className="text-button" href="/">
          Voltar ao catálogo
        </Link>
      </main>
    </PublicShell>
  );
}
