"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";

import { callAppsScript, hasAdminWriteToken, type ScriptResponse } from "@/lib/admin/apps-script";
import { accessAuthor, canUseSheets, getAdminAccess, type AdminAccess } from "@/modules/auth/access";
import type { Permission } from "@/modules/auth/permissions";

import {
  checkImageFile,
  CODE_PATTERN,
  IMAGE_SLOTS,
  parseCategoryForm,
  parseCostForm,
  parseCustomerForm,
  parseProductForm,
  parseQuoteUpdate,
  translateScriptMessage,
} from "./admin-forms";
import { clearAdminSnapshotCache } from "./sheets-data";

export type AdminFormState = { ok: boolean; message: string } | null;

const fail = (message: string): AdminFormState => ({ ok: false, message });

/**
 * Cada ação confere, no servidor e a cada envio: sessão, permissão do papel,
 * tenant dono da planilha e token de escrita configurado. Renderizar ou não um
 * formulário não é barreira de segurança; esta função é.
 */
async function authorize(
  permission: Permission,
): Promise<{ access: AdminAccess; error?: undefined } | { access?: undefined; error: AdminFormState }> {
  const access = await getAdminAccess();
  if (!access || !canUseSheets(access, permission)) {
    return { error: fail("Você não tem permissão para esta operação.") };
  }
  if (!hasAdminWriteToken()) {
    return { error: fail("A edição pelo painel ainda não está configurada no servidor.") };
  }
  return { access };
}

/** Traduz a resposta de Apps Script em uma mensagem para o painel. */
function scriptFailure(result: ScriptResponse | null, what: string): AdminFormState {
  if (!result) return fail("Não foi possível falar com a planilha. Tente novamente em instantes.");
  switch (result.codigo) {
    case "CONFLICTO":
      refresh();
      return fail(`${what} foi alterado por outra pessoa (ou direto na planilha) enquanto você editava. Os dados foram recarregados: confira e salve de novo.`);
    case "DUPLICADO":
      return fail("Já existe um cliente com esse e-mail. Edite o cadastro existente em vez de criar outro.");
    case "NO_ENCONTRADO":
      refresh();
      return fail(`${what} não existe mais na planilha.`);
    case "NO_AUTORIZADO":
    case "NO_CONFIGURADO":
      return fail("A planilha recusou a conexão do painel. Verifique o token de escrita.");
    case "NO_CONFIGURADO_DRIVE":
      return fail("Falta configurar a pasta de imagens (DRIVE_UPLOAD_ID) na planilha.");
    default:
      return fail(result.error ? translateScriptMessage(result.error) : "Não foi possível salvar.");
  }
}

function afterWrite(catalogChanged: boolean) {
  clearAdminSnapshotCache();
  if (catalogChanged) updateTag("catalog"); // o catálogo público mostra a mudança na próxima visita
  refresh();
}

/* ------------------------------------------------------------------ produtos */

export async function saveProductAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const auth = await authorize("catalog:write");
  if (!auth.access) return auth.error;
  const parsed = parseProductForm(formData);
  if (!parsed.ok) return fail(parsed.error);
  const p = parsed.value;

  const result = await callAppsScript("admin_guardar_producto", {
    modo: p.mode,
    fechaActualizacion: p.updatedAt,
    autor: accessAuthor(auth.access),
    producto: {
      codigo: p.code,
      nombre: p.name,
      categoria: p.category,
      subcategoria: p.subcategory,
      descripcion: p.description,
      precio: p.price,
      estado: p.state,
      destacado: p.featured,
      observaciones: p.notes,
      imagenes: p.images,
    },
  });
  if (!result?.ok) return scriptFailure(result, "Este produto");

  clearAdminSnapshotCache();
  updateTag("catalog");
  if (p.mode === "crear") redirect(`/admin/produtos/${encodeURIComponent(p.code)}?criado=1`);
  refresh();
  return { ok: true, message: "Produto salvo." };
}

export async function uploadImageAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const auth = await authorize("catalog:write");
  if (!auth.access) return auth.error;

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const slot = Number(formData.get("slot"));
  const updatedAt = String(formData.get("updatedAt") ?? "").trim().slice(0, 40);
  const file = formData.get("file");
  if (!CODE_PATTERN.test(code)) return fail("Produto inválido.");
  if (!Number.isInteger(slot) || slot < 0 || slot >= IMAGE_SLOTS) return fail("Espaço de imagem inválido.");
  if (!(file instanceof File) || !file.size) return fail("Escolha uma imagem.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const problem = checkImageFile(file.type, bytes);
  if (problem) return fail(problem);

  const result = await callAppsScript(
    "admin_subir_imagen",
    {
      codigo: code,
      espacio: slot,
      tipo: file.type,
      contenido: Buffer.from(bytes).toString("base64"),
      fechaActualizacion: updatedAt,
      autor: accessAuthor(auth.access),
    },
    { timeoutMs: 60000 },
  );
  if (!result?.ok) return scriptFailure(result, "Este produto");
  afterWrite(true);
  return { ok: true, message: "Imagem enviada e associada ao produto." };
}

/* -------------------------------------------------------------------- custos */

export async function saveCostAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const auth = await authorize("costs:write");
  if (!auth.access) return auth.error;
  const parsed = parseCostForm(formData);
  if (!parsed.ok) return fail(parsed.error);
  const c = parsed.value;
  const result = await callAppsScript("admin_guardar_costo", {
    codigo: c.code,
    costo: c.cost,
    proveedor: c.supplier,
    notas: c.notes,
    version: c.version,
    autor: accessAuthor(auth.access),
  });
  if (!result?.ok) return scriptFailure(result, "Este custo");
  afterWrite(false);
  return { ok: true, message: "Custo salvo. Ele nunca aparece no catálogo público." };
}

/* ---------------------------------------------------------------- categorias */

export async function saveCategoryAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const auth = await authorize("catalog:write");
  if (!auth.access) return auth.error;
  const parsed = parseCategoryForm(formData);
  if (!parsed.ok) return fail(parsed.error);
  const c = parsed.value;
  const result = await callAppsScript("admin_guardar_categoria", {
    version: c.version,
    autor: accessAuthor(auth.access),
    categoria: { id: c.id, nombre: c.name, descripcion: c.description, orden: c.order, activa: c.active },
  });
  if (!result?.ok) return scriptFailure(result, "Esta categoria");
  afterWrite(true);
  const moved = typeof result.productosActualizados === "number" ? result.productosActualizados : 0;
  return {
    ok: true,
    message: c.id
      ? moved ? `Categoria salva. ${moved} produto(s) passaram a usar o novo nome.` : "Categoria salva."
      : "Categoria criada.",
  };
}

/* ------------------------------------------------------------------ clientes */

export async function saveCustomerAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const auth = await authorize("customers:write");
  if (!auth.access) return auth.error;
  const parsed = parseCustomerForm(formData);
  if (!parsed.ok) return fail(parsed.error);
  const c = parsed.value;
  const result = await callAppsScript("admin_guardar_cliente", {
    version: c.version,
    autor: accessAuthor(auth.access),
    cliente: { id: c.id, nombre: c.name, empresa: c.company, email: c.email, telefono: c.phone },
  });
  if (!result?.ok) return scriptFailure(result, "Este cliente");
  afterWrite(false);
  return { ok: true, message: c.id ? "Cliente salvo." : "Cliente cadastrado." };
}

/* ---------------------------------------------------------------- orçamentos */

export async function updateQuoteAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const auth = await authorize("quotations:write");
  if (!auth.access) return auth.error;
  const parsed = parseQuoteUpdate(formData);
  if (!parsed.ok) return fail(parsed.error);
  const q = parsed.value;
  const result = await callAppsScript("admin_actualizar_cotizacion", {
    id: q.id,
    estado: q.status,
    notasInternas: q.internalNotes,
    version: q.version,
    autor: accessAuthor(auth.access),
  });
  if (!result?.ok) return scriptFailure(result, "Este orçamento");
  afterWrite(false);
  return { ok: true, message: "Orçamento atualizado." };
}
