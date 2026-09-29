import { hasSupabaseConfig } from "../../lib/supabase/config.ts";
import { can, type Permission, type Role } from "./permissions.ts";

export function isAdminPreviewEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.CREER_ADMIN_PREVIEW === "true"
  );
}

export type SupabaseRole =
  | "provider_owner"
  | "tenant_admin"
  | "sales"
  | "catalog_editor";

export type AdminAccess =
  | { mode: "preview"; role: "preview"; tenantId: "demo" }
  | {
      mode: "supabase";
      role: SupabaseRole;
      tenantId: string;
      tenantName: string;
      tenantSlug: string;
      userId: string;
      userEmail: string;
    };

export async function getAdminAccess(): Promise<AdminAccess | null> {
  if (!hasSupabaseConfig()) {
    return isAdminPreviewEnabled()
      ? { mode: "preview", role: "preview", tenantId: "demo" }
      : null;
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id, role, tenants(name, slug)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;
  const tenant = membership.tenants as unknown as { name: string; slug: string } | null;
  return {
    mode: "supabase",
    role: membership.role as SupabaseRole,
    tenantId: membership.tenant_id,
    tenantName: tenant?.name ?? "Creer",
    tenantSlug: tenant?.slug ?? "",
    userId,
    userEmail: typeof data?.claims?.email === "string" ? data.claims.email : "",
  };
}

/** La planilla de Google pertenece a un solo cliente del SaaS (Creer). */
export function sheetsTenantSlug() {
  return process.env.CREER_TENANT_SLUG?.trim() || "creer";
}

/** ¿Puede ver clientes y cotizaciones de la planilha? Solo el tenant dueño. */
export function canReadSheetsData(access: AdminAccess | null): boolean {
  if (!access) return false;
  if (access.mode === "preview") return isAdminPreviewEnabled();
  return access.tenantSlug === sheetsTenantSlug();
}

/**
 * ¿Puede hacer esta operación sobre la planilha? Se revisa en el servidor en
 * cada lectura sensible y en cada escritura: permiso del rol Y pertenecer al
 * tenant dueño de la planilla. La prévia local (solo en desarrollo) puede todo,
 * para probar; en producción esa bandera se ignora.
 */
export function canUseSheets(access: AdminAccess | null, permission: Permission): boolean {
  if (!access) return false;
  if (access.mode === "preview") return isAdminPreviewEnabled();
  return (
    access.tenantSlug === sheetsTenantSlug() &&
    can(
      { userId: access.userId, tenantId: access.tenantId, role: access.role as Role },
      access.tenantId,
      permission,
    )
  );
}

/** ¿Puede editar el catálogo (productos, categorías e imágenes)? */
export function canEditSheetsCatalog(access: AdminAccess | null): boolean {
  return canUseSheets(access, "catalog:write");
}

/** Quién hizo el cambio, para LOGS de la planilla. */
export function accessAuthor(access: AdminAccess | null): string {
  if (!access) return "desconhecido";
  return access.mode === "supabase" ? access.userEmail || access.userId : "prévia local";
}
