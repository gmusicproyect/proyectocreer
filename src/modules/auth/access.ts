import { hasSupabaseConfig } from "../../lib/supabase/config.ts";

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
      userId: string;
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
    .select("tenant_id, role, tenants(name)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;
  const tenant = membership.tenants as unknown as { name: string } | null;
  return {
    mode: "supabase",
    role: membership.role as SupabaseRole,
    tenantId: membership.tenant_id,
    tenantName: tenant?.name ?? "Creer",
    userId,
  };
}
