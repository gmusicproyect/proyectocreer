"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { createRecoveryClient } from "@/lib/supabase/client";
import { requestPasswordReset, saveNewPassword, type PasswordState } from "./actions";

export function RequestPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {} as PasswordState);
  if (state.sent) return (
    <div className="notice" role="status">
      <p>Se este e-mail estiver cadastrado, você receberá um link para definir sua senha. Confira também a pasta de spam.</p>
      <p>Abra o link mais recente. Se ele expirar, volte aqui para solicitar outro.</p>
    </div>
  );
  return (
    <form action={action} className="login-form">
      <label className="field"><span>E-mail da sua conta</span>
        <input name="email" type="email" autoComplete="email" maxLength={254} required />
      </label>
      {state.error && <div className="form-error" role="alert">{state.error}</div>}
      <button className="button wide" disabled={pending} type="submit">
        {pending ? "Enviando…" : "Enviar link para criar minha senha"}
      </button>
    </form>
  );
}

async function preparePasswordSession() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  const type = fragment.get("type");
  const hasError = fragment.has("error") || fragment.has("error_code");
  // Recovery credentials stay in memory and are removed from the address bar
  // before any async work. Never render, log or send them to analytics.
  if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  if (hasError) return false;
  const supabase = createRecoveryClient();
  if (accessToken || refreshToken) {
    if (!accessToken || !refreshToken || !["recovery", "invite"].includes(type ?? "")) return false;
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) return false;
  }
  const { data, error } = await supabase.auth.getUser();
  return !error && !!data.user;
}

export function NewPasswordForm() {
  const [ready, setReady] = useState<boolean | null>(null);
  const initialization = useRef<Promise<boolean> | null>(null);
  const [state, action, pending] = useActionState(saveNewPassword, {} as PasswordState);
  useEffect(() => {
    let active = true;
    initialization.current ??= preparePasswordSession();
    initialization.current.then((valid) => { if (active) setReady(valid); })
      .catch(() => { if (active) setReady(false); });
    return () => { active = false; };
  }, []);
  if (ready === null) return <p role="status">Verificando seu link…</p>;
  if (!ready) return (
    <div className="notice" role="alert">
      <p>Este link está inválido ou expirou. Solicite um novo e-mail para definir sua senha.</p>
      <Link className="text-button" href="/acesso/recuperar">Solicitar novo link</Link>
    </div>
  );
  return (
    <form action={action} className="login-form">
      <label className="field"><span>Nova senha</span>
        <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
      </label>
      <label className="field"><span>Confirme a nova senha</span>
        <input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
      </label>
      <p>Use pelo menos 8 caracteres. Escolha uma senha que você não usa em outros sites.</p>
      {state.error && <div className="form-error" role="alert">{state.error}</div>}
      <button className="button wide" type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar minha senha"}
      </button>
    </form>
  );
}
