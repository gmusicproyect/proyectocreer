/**
 * Validación pura (sin Next ni red) de los formularios del panel.
 * Apps Script vuelve a validar todo; aquí se atrapan los errores comunes con
 * mensajes en portugués antes de llegar a Google.
 */
import { EDITABLE_STATES, type EditableState } from "./product-edit.ts";

type Source = { get(name: string): unknown };
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9.@-]{1,39}$/;
const MONEY = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERSION = /^[A-Za-z0-9_.:+\-]{0,60}$/;
const DRIVE_FILE = /\/d\/([a-zA-Z0-9_-]{10,})|[?&]id=([a-zA-Z0-9_-]{10,})|^([a-zA-Z0-9_-]{15,})$/;

export const QUOTE_STATES = ["NUEVA", "EN_ANALISIS", "COTIZADA", "APROBADA", "RECHAZADA"] as const;
export type QuoteState = (typeof QUOTE_STATES)[number];

export const IMAGE_SLOTS = 3;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function field(source: Source, name: string) {
  const value = source.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function tooLong(value: string, max: number, label: string): string | null {
  return value.length > max ? `${label} passa de ${max} caracteres.` : null;
}

function money(value: string, label: string): string | null {
  const clean = value.replace(/^R\$\s*/i, "");
  if (!clean) return null;
  if (clean.length > 20 || !MONEY.test(clean)) return `${label} inválido. Use o formato 1.234,50.`;
  return null;
}

function version(source: Source, name: string): string | null {
  const v = field(source, name);
  return VERSION.test(v) ? v : null;
}

/* ------------------------------------------------------------------ produtos */

export type ImageAction = { tipo: "mantener" } | { tipo: "quitar" } | { tipo: "drive"; valor: string };

export interface ProductForm {
  mode: "crear" | "editar";
  code: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  price: string;
  state: EditableState;
  featured: boolean;
  notes: string;
  images: ImageAction[];
  updatedAt: string;
}

export function parseProductForm(source: Source): Parsed<ProductForm> {
  const mode = field(source, "mode") === "crear" ? "crear" : "editar";
  const code = field(source, "code").toUpperCase();
  const name = field(source, "name");
  const category = field(source, "category");
  const subcategory = field(source, "subcategory");
  const description = field(source, "description");
  const price = field(source, "price").replace(/^R\$\s*/i, "");
  const state = field(source, "state").toUpperCase();
  const notes = field(source, "notes");
  const updatedAt = field(source, "updatedAt");

  const errors = [
    CODE_PATTERN.test(code) ? null : "Código inválido: use letras, números, @, hífen ou ponto (2 a 40 caracteres, sem espaços).",
    name ? null : "O nome é obrigatório.",
    tooLong(name, 150, "O nome"),
    tooLong(category, 80, "A categoria"),
    tooLong(subcategory, 80, "A subcategoria"),
    tooLong(description, 5000, "A descrição"),
    tooLong(notes, 1000, "As notas internas"),
    money(price, "Preço"),
    (EDITABLE_STATES as readonly string[]).includes(state) ? null : "Estado inválido.",
    updatedAt.length > 40 ? "Versão do produto inválida." : null,
  ].filter(Boolean);

  if (state === "PUBLICADO") {
    const missing = [
      !category && "categoria",
      !price && "preço",
      !description && "descrição",
    ].filter(Boolean);
    if (missing.length) errors.push(`Para publicar falta: ${missing.join(", ")}. Salve como Pendente enquanto isso.`);
  }

  const images: ImageAction[] = [];
  for (let i = 0; i < IMAGE_SLOTS; i++) {
    const action = field(source, `image${i}`) || "mantener";
    if (action === "quitar") images.push({ tipo: "quitar" });
    else if (action === "drive") {
      const link = field(source, `image${i}Link`);
      if (!link || link.length > 500 || !DRIVE_FILE.test(link)) {
        errors.push(`Imagem ${i + 1}: cole o link de compartilhamento do arquivo no Google Drive.`);
      }
      images.push({ tipo: "drive", valor: link });
    } else if (action === "mantener") images.push({ tipo: "mantener" });
    else errors.push(`Imagem ${i + 1}: ação inválida.`);
  }

  if (errors.length) return { ok: false, error: errors.join(" ") };
  return {
    ok: true,
    value: {
      mode, code, name, category, subcategory, description, price,
      state: state as EditableState,
      featured: field(source, "featured") === "on",
      notes, images, updatedAt,
    },
  };
}

/* ---------------------------------------------------------------- categorias */

export interface CategoryForm {
  id: string;
  name: string;
  description: string;
  order: number;
  active: boolean;
  version: string;
}

export function parseCategoryForm(source: Source): Parsed<CategoryForm> {
  const id = field(source, "id");
  const name = field(source, "name");
  const description = field(source, "description");
  const orderText = field(source, "order") || "0";
  const order = Number(orderText);
  const v = version(source, "version");
  const errors = [
    /^\d{0,10}$/.test(id) ? null : "Categoria inválida.",
    name ? null : "A categoria precisa de um nome.",
    tooLong(name, 80, "O nome"),
    tooLong(description, 500, "A descrição"),
    /^\d{1,4}$/.test(orderText) && Number.isInteger(order) ? null : "A ordem deve ser um número entre 0 e 9999.",
    v === null ? "Versão inválida." : null,
  ].filter(Boolean);
  if (errors.length) return { ok: false, error: errors.join(" ") };
  return { ok: true, value: { id, name, description, order, active: field(source, "active") === "on", version: v ?? "" } };
}

/* ------------------------------------------------------------------ clientes */

export interface CustomerForm {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  version: string;
}

export function parseCustomerForm(source: Source): Parsed<CustomerForm> {
  const id = field(source, "id");
  const name = field(source, "name");
  const company = field(source, "company");
  const email = field(source, "email").toLowerCase();
  const phone = field(source, "phone");
  const v = version(source, "version");
  const errors = [
    /^\d{0,10}$/.test(id) ? null : "Cliente inválido.",
    email ? null : "O e-mail é obrigatório.",
    email && (email.length > 254 || !EMAIL.test(email)) ? "E-mail inválido." : null,
    name || company ? null : "Informe o nome ou a empresa.",
    tooLong(name, 150, "O nome"),
    tooLong(company, 150, "A empresa"),
    tooLong(phone, 60, "O telefone"),
    v === null ? "Versão inválida." : null,
  ].filter(Boolean);
  if (errors.length) return { ok: false, error: errors.join(" ") };
  return { ok: true, value: { id, name, company, email, phone, version: v ?? "" } };
}

/* ---------------------------------------------------------------- orçamentos */

export interface QuoteUpdate {
  id: string;
  status: QuoteState;
  internalNotes: string;
  version: string;
}

export function parseQuoteUpdate(source: Source): Parsed<QuoteUpdate> {
  const id = field(source, "id");
  const status = field(source, "status").toUpperCase();
  const internalNotes = field(source, "internalNotes");
  const v = version(source, "version");
  const errors = [
    /^\d{1,10}$/.test(id) ? null : "Orçamento inválido.",
    (QUOTE_STATES as readonly string[]).includes(status) ? null : "Situação inválida.",
    tooLong(internalNotes, 2000, "As notas internas"),
    v === null ? "Versão inválida." : null,
  ].filter(Boolean);
  if (errors.length) return { ok: false, error: errors.join(" ") };
  return { ok: true, value: { id, status: status as QuoteState, internalNotes, version: v ?? "" } };
}

/* -------------------------------------------------------------------- custos */

export interface CostForm {
  code: string;
  cost: string;
  supplier: string;
  notes: string;
  version: string;
}

export function parseCostForm(source: Source): Parsed<CostForm> {
  const code = field(source, "code").toUpperCase();
  const cost = field(source, "cost").replace(/^R\$\s*/i, "");
  const supplier = field(source, "supplier");
  const notes = field(source, "notes");
  const v = version(source, "version");
  const errors = [
    CODE_PATTERN.test(code) ? null : "Código de produto inválido.",
    money(cost, "Custo"),
    tooLong(supplier, 120, "O fornecedor"),
    tooLong(notes, 1000, "As notas"),
    v === null ? "Versão inválida." : null,
  ].filter(Boolean);
  if (errors.length) return { ok: false, error: errors.join(" ") };
  return { ok: true, value: { code, cost, supplier, notes, version: v ?? "" } };
}

/* ------------------------------------------------------------------- imagens */

/** Confere tipo, tamanho e a assinatura real do arquivo (não basta a extensão). */
export function checkImageFile(type: string, bytes: Uint8Array): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(type)) return "Envie uma imagem JPG, PNG ou WEBP.";
  if (!bytes.length) return "O arquivo está vazio.";
  if (bytes.length > MAX_IMAGE_BYTES) return "A imagem passa de 3 MB. Reduza o tamanho e tente de novo.";
  const b = (i: number) => bytes[i] ?? -1;
  const signature =
    type === "image/jpeg"
      ? b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff
      : type === "image/png"
        ? b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47
        : b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
          b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50;
  return signature ? null : "O arquivo não é uma imagem válida.";
}

/* ------------------------------------------------------------------- margens */

/** Margem sobre o preço de venda (0.35 = 35%). Null quando não dá para calcular. */
export function marginOf(price: number | null, cost: number | null): number | null {
  if (price === null || cost === null || price <= 0) return null;
  return (price - cost) / price;
}

/* ------------------------------------------------- mensagens da planilha */

/**
 * Apps Script responde em espanhol (é o idioma do código da planilha).
 * O painel é em português: traduz as mensagens conhecidas e deixa o resto igual.
 */
const SCRIPT_MESSAGES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^La categoría "(.+)" ya existe\.?$/, (m) => `A categoria "${m[1]}" já existe.`],
  [/^Ya existe otra categoría llamada "(.+)"\.?$/, (m) => `Já existe outra categoria chamada "${m[1]}".`],
  [/^La categoría "(.+)" no existe\. Créala primero\.?$/, (m) => `A categoria "${m[1]}" não existe. Crie a categoria primeiro.`],
  [/^Ya existe un producto con el código (.+?)\.?$/, (m) => `Já existe um produto com o código ${m[1]}.`],
  [/^Imagen (\d): el archivo no es una imagen\.?$/, (m) => `Imagem ${m[1]}: o arquivo do Drive não é uma imagem.`],
  [/^Imagen (\d): no existe o no tienes acceso\.?$/, (m) => `Imagem ${m[1]}: o arquivo não existe ou a conta da planilha não tem acesso a ele.`],
  [/^Imagen (\d): el archivo está en la papelera\.?$/, (m) => `Imagem ${m[1]}: o arquivo está na lixeira do Drive.`],
  [/^La imagen (\d) ya pertenece al producto (.+?)\.?$/, (m) => `A imagem ${m[1]} já pertence ao produto ${m[2]}.`],
  [/^La imagen (\d) está repetida en este producto\.?$/, (m) => `A imagem ${m[1]} está repetida neste produto.`],
  [/^Para PUBLICAR falta: (.+?)\. Guárdalo como BORRADOR mientras tanto\.?$/, (m) =>
    `Para publicar falta: ${m[1].replace("categoría", "categoria").replace("precio", "preço").replace("descripción", "descrição").replace("imagen principal", "imagem principal").replace("nombre", "nome")}. Salve como Pendente enquanto isso.`],
  [/^El precio debe ser un número mayor o igual a 0\.?$/, () => "O preço deve ser um número maior ou igual a 0."],
  [/^El costo debe ser un número mayor o igual a 0\.?$/, () => "O custo deve ser um número maior ou igual a 0."],
  [/^La imagen supera 3 MB\.?$/, () => "A imagem passa de 3 MB."],
  [/^El archivo no es una imagen válida\.?$/, () => "O arquivo não é uma imagem válida."],
  [/^Solo se aceptan imágenes JPG, PNG o WEBP\.?$/, () => "Envie uma imagem JPG, PNG ou WEBP."],
  [/^El sistema está ocupado.*$/, () => "A planilha está ocupada com outra importação ou edição. Tente de novo em alguns segundos."],
];

export function translateScriptMessage(message: string): string {
  return message
    .split("\n")
    .map((line) => {
      const text = line.trim();
      for (const [pattern, render] of SCRIPT_MESSAGES) {
        const match = text.match(pattern);
        if (match) return render(match);
      }
      return text;
    })
    .filter(Boolean)
    .join(" ");
}
