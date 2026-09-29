export type Role =
  | "provider_owner"
  | "tenant_admin"
  | "sales"
  | "catalog_editor";
export type Permission =
  | "catalog:write"
  | "costs:read"
  | "costs:write"
  | "customers:write"
  | "quotations:write"
  | "team:manage"
  | "subscription:read"
  | "subscription:manage";
const permissions: Record<Role, readonly Permission[]> = {
  provider_owner: ["subscription:read", "subscription:manage"],
  tenant_admin: [
    "catalog:write",
    "costs:read",
    "costs:write",
    "customers:write",
    "quotations:write",
    "team:manage",
    "subscription:read",
  ],
  sales: ["customers:write", "quotations:write"],
  catalog_editor: ["catalog:write"],
};
/** Matriz de só leitura para a tela "Equipe e permissões". */
export const rolePermissions: Readonly<Record<Role, readonly Permission[]>> = permissions;

export interface Membership {
  userId: string;
  tenantId: string;
  role: Role;
}
/** Foundation policy. Future callers must obtain membership from a verified server session. */
export function can(
  membership: Membership | null,
  tenantId: string,
  permission: Permission,
): boolean {
  return (
    !!membership &&
    membership.tenantId === tenantId &&
    (permissions[membership.role]?.includes(permission) ?? false)
  );
}
