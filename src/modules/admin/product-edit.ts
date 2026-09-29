/**
 * Validación pura (sin Next ni red) de la edición rápida de productos.
 * El servidor de Apps Script vuelve a validar todo; esto evita enviar basura
 * y da mensajes claros antes de llegar a Google.
 */

export const EDITABLE_STATES = ["BORRADOR", "PENDIENTE", "PUBLICADO", "OCULTO"] as const;
export type EditableState = (typeof EDITABLE_STATES)[number];

export interface ProductEdit {
  code: string;
  price: string; // texto tal cual ("1.234,50" o "" para "sob consulta")
  state: EditableState;
  updatedAt: string;
}

export type ProductEditParse =
  | { ok: true; value: ProductEdit }
  | { ok: false; error: string };

const CODE = /^[A-Z0-9][A-Z0-9.@-]{1,39}$/;
const PRICE = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/;

function field(source: { get(name: string): unknown }, name: string) {
  const value = source.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function parseProductEdit(source: { get(name: string): unknown }): ProductEditParse {
  const code = field(source, "code").toUpperCase();
  const price = field(source, "price").replace(/^R\$\s*/i, "");
  const state = field(source, "state").toUpperCase();
  const updatedAt = field(source, "updatedAt");

  if (!CODE.test(code)) return { ok: false, error: "Código de produto inválido." };
  if (price && (price.length > 20 || !PRICE.test(price))) {
    return { ok: false, error: "Preço inválido. Use o formato 1.234,50 ou deixe vazio para “sob consulta”." };
  }
  if (!EDITABLE_STATES.includes(state as EditableState)) {
    return { ok: false, error: "Estado inválido." };
  }
  if (updatedAt.length > 40) return { ok: false, error: "Versão do produto inválida." };
  return { ok: true, value: { code, price, state: state as EditableState, updatedAt } };
}

/** 1234.5 -> "1.234,50" para el campo de edición. */
export function priceToInput(value: number | null) {
  if (value === null) return "";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
