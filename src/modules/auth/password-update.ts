import { passwordValidation } from "./password-policy.ts";

type PasswordAuth = {
  getUser(): Promise<{ data: { user: unknown | null }; error: unknown }>;
  updateUser(attributes: { password: string }): Promise<{ error: unknown }>;
  signOut(): Promise<{ error: unknown }>;
};

export async function updatePassword(auth: PasswordAuth, password: string, confirmation: string) {
  const validation = passwordValidation(password, confirmation);
  if (validation) return { error: validation };
  const { data, error: authError } = await auth.getUser();
  if (authError || !data.user) return { error: "Este link expirou. Solicite um novo e-mail." };
  const { error } = await auth.updateUser({ password });
  if (error) return { error: "Não foi possível salvar a senha. Escolha outra senha ou solicite um novo link." };
  await auth.signOut();
  return { saved: true as const };
}
