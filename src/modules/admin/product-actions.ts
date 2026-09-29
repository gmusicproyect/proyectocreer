"use server";

import { refresh, updateTag } from "next/cache";

import { getGoogleSheetsQuoteConfig } from "@/lib/quotes/config";
import { canEditSheetsCatalog, getAdminAccess } from "@/modules/auth/access";

import { parseProductEdit } from "./product-edit";
import { clearAdminSnapshotCache } from "./sheets-data";

export type ProductEditState = { ok: boolean; message: string } | null;

/**
 * Edición rápida de precio y estado desde el panel.
 * Todo se revisa aquí, en el servidor: sesión, rol, tenant y datos. El token de
 * escritura nunca llega al navegador.
 */
export async function updateProductAction(
  _previous: ProductEditState,
  formData: FormData,
): Promise<ProductEditState> {
  const access = await getAdminAccess();
  if (!canEditSheetsCatalog(access)) {
    return { ok: false, message: "Você não tem permissão para editar o catálogo." };
  }

  const writeToken = process.env.GOOGLE_ADMIN_WRITE_TOKEN?.trim();
  if (!writeToken) {
    return { ok: false, message: "A edição pelo painel ainda não está configurada." };
  }

  const parsed = parseProductEdit(formData);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  const edit = parsed.value;

  let result: { ok?: boolean; codigo?: string; error?: string };
  try {
    const { url } = getGoogleSheetsQuoteConfig();
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accion: "admin_actualizar_producto",
        apiToken: writeToken,
        codigo: edit.code,
        cambios: { precio: edit.price, estado: edit.state },
        fechaActualizacion: edit.updatedAt,
        autor: access?.mode === "supabase" ? access.userEmail || access.userId : "prévia local",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    result = (await response.json()) as typeof result;
  } catch {
    return { ok: false, message: "Não foi possível falar com a planilha. Tente novamente." };
  }

  clearAdminSnapshotCache();

  if (!result.ok) {
    if (result.codigo === "CONFLICTO") {
      refresh();
      return {
        ok: false,
        message: "Este produto foi alterado por outra pessoa (ou na planilha) enquanto você editava. Os dados foram recarregados: confira e salve de novo.",
      };
    }
    return { ok: false, message: result.error || "Não foi possível salvar." };
  }

  updateTag("catalog"); // o catálogo público mostra a mudança na próxima visita
  refresh();
  return { ok: true, message: "Salvo." };
}
