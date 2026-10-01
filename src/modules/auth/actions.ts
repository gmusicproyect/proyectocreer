"use server";

import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { updatePassword } from "./password-update";

export type PasswordState = { error?: string; sent?: boolean };

export async function requestPasswordReset(
  _previous: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  if (!hasSupabaseConfig()) return { error: "O acesso seguro está indisponível." };
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: "Informe um e-mail válido." };
  }
  const { url, key } = getSupabaseConfig();
  // A recovery email may be opened on another device. Do not bind it to
  // the sender's PKCE verifier or create an administrator session here.
  const supabase = createSupabaseClient(url, key, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://proyecto-creer.vercel.app/acesso/nova-senha",
  });
  if (error?.code === "email_address_not_authorized") {
    return { error: "O envio de e-mails precisa ser configurado pela equipe Creer. Entre em contato para ativar seu acesso." };
  }
  if (error) return { error: "Não foi possível enviar o e-mail agora. Aguarde alguns minutos ou fale com a equipe Creer." };
  return { sent: true };
}

export async function saveNewPassword(
  _previous: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  if (!hasSupabaseConfig()) return { error: "O acesso seguro está indisponível." };
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const result = await updatePassword(supabase.auth, password, String(formData.get("confirmation") ?? ""));
  if (result.error) return { error: result.error };
  redirect("/acesso?senha=atualizada");
}

export async function login(formData: FormData) {
  if (!hasSupabaseConfig()) redirect("/acesso?erro=configuracao");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/acesso?erro=campos");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/acesso?erro=credenciais");
  redirect("/admin");
}

export async function logout() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/acesso");
}
