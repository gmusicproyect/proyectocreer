export function passwordValidation(password: string, confirmation: string) {
  if (password.length < 8) return "Use uma senha com pelo menos 8 caracteres.";
  if (password.length > 128) return "Use uma senha com até 128 caracteres.";
  if (password !== confirmation) return "As senhas precisam ser iguais.";
  return null;
}

export function authDestination(type: string, requested: string | null) {
  if (type === "recovery" || type === "invite") return "/acesso/nova-senha";
  // Authentication links never redirect to an arbitrary URL or API endpoint.
  return requested === "/acesso/nova-senha" ? requested : "/admin";
}
