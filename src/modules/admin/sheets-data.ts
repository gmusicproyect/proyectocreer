import { callAppsScript } from "../../lib/admin/apps-script.ts";
import {
  getGoogleSheetsQuoteConfig,
  hasGoogleSheetsQuoteConfig,
} from "../../lib/quotes/config.ts";

export interface SheetsAdminProduct {
  code: string;
  name: string;
  category: string;
  subcategory: string;
  price: number | null;
  currency: "BRL";
  state: string;
  featured: boolean;
  incomplete: boolean;
  image: string;
  images: string[];
  description: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SheetsAdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  order: number;
  productCount: number;
  version: string;
}

export interface SheetsAdminCustomer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  duplicate: boolean;
  quoteCount: number;
}

export interface SheetsAdminQuoteItem {
  code: string;
  name: string;
  quantity: number;
  finish: string;
  personalization: string;
  referencePrice: number | null;
  currency: "BRL";
}

export interface SheetsAdminQuote {
  id: string;
  reference: string;
  status: string;
  notes: string;
  internalNotes: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  contact: {
    name: string;
    company: string;
    email: string;
    phone: string;
  };
  items: SheetsAdminQuoteItem[];
}

export interface SheetsAdminSnapshot {
  generatedAt: string;
  products: SheetsAdminProduct[];
  categories: SheetsAdminCategory[];
  customers: SheetsAdminCustomer[];
  quotes: SheetsAdminQuote[];
  stats: {
    total: number;
    published: number;
    pending: number;
    hidden: number;
    drafts: number;
    categories: number;
    withoutImage: number;
    incomplete: number;
  };
}

let recentSnapshot: { value: SheetsAdminSnapshot; expiresAt: number } | null = null;
let pendingSnapshot: Promise<SheetsAdminSnapshot | null> | null = null;

const SNAPSHOT_TTL_MS = 60_000;

/** Tras una edición, la próxima lectura va directo a la planilla. */
export function clearAdminSnapshotCache() {
  recentSnapshot = null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function price(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function list(value: unknown) {
  return Array.isArray(value) ? value : [];
}

/** Só aceita URLs de imagem do Google (o painel nunca recebe IDs soltos de Drive). */
function safeImage(value: unknown) {
  const url = text(value);
  return /^https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+$/.test(url) ? url : "";
}

export function adminSnapshotFromApi(payload: unknown): SheetsAdminSnapshot {
  const root = record(payload);
  if (root.ok !== true || !root.datos) throw new Error("Resposta inválida da administração.");
  const data = record(root.datos);
  const rawStats = record(data.stats);

  const products = list(data.productos).flatMap((value) => {
    const item = record(value);
    const code = text(item.codigo).toUpperCase();
    if (!code) return [];
    return [{
      code,
      name: text(item.nombre) || "Produto sem nome",
      category: text(item.categoria),
      subcategory: text(item.subcategoria),
      price: price(item.precio),
      currency: "BRL" as const,
      state: text(item.estado).toUpperCase() || "PENDIENTE",
      featured: item.destacado === true,
      incomplete: item.incompleto === true,
      image: text(item.imagen),
      images: [0, 1, 2].map((i) => safeImage(list(item.imagenes)[i])),
      description: text(item.descripcion),
      notes: text(item.observaciones),
      createdAt: text(item.fechaCreacion),
      updatedAt: text(item.fechaActualizacion),
    }];
  });

  const categories = list(data.categorias).flatMap((value) => {
    const item = record(value);
    const name = text(item.nombre);
    if (!name) return [];
    return [{
      id: text(item.id),
      name,
      slug: text(item.slug),
      description: text(item.descripcion),
      active: item.activa !== false,
      order: number(item.orden, 9999),
      productCount: Math.max(0, number(item.productos)),
      version: text(item.version),
    }];
  });

  const customers = list(data.clientes).flatMap((value) => {
    const item = record(value);
    const id = text(item.id);
    const email = text(item.email);
    if (!id && !email) return [];
    return [{
      id,
      name: text(item.nombre),
      company: text(item.empresa),
      email,
      phone: text(item.telefono),
      createdAt: text(item.fechaCreacion),
      updatedAt: text(item.fechaActualizacion),
      version: text(item.version),
      duplicate: item.duplicado === true,
      quoteCount: Math.max(0, number(item.cotizaciones)),
    }];
  });

  const quotes = list(data.cotizaciones).flatMap((value) => {
    const item = record(value);
    const reference = text(item.referencia);
    if (!reference) return [];
    const contact = record(item.contacto);
    return [{
      id: text(item.id),
      reference,
      status: text(item.estado).toUpperCase() || "NUEVA",
      notes: text(item.notas),
      internalNotes: text(item.notasInternas),
      customerId: text(item.clienteId),
      createdAt: text(item.fechaCreacion),
      updatedAt: text(item.fechaActualizacion),
      version: text(item.version),
      contact: {
        name: text(contact.nombre),
        company: text(contact.empresa),
        email: text(contact.email),
        phone: text(contact.telefono),
      },
      items: list(item.items).flatMap((rawItem) => {
        const quoteItem = record(rawItem);
        const code = text(quoteItem.codigo).toUpperCase();
        if (!code) return [];
        return [{
          code,
          name: text(quoteItem.nombre),
          quantity: Math.max(0, number(quoteItem.cantidad)),
          finish: text(quoteItem.acabamento),
          personalization: text(quoteItem.personalizacion),
          referencePrice: price(quoteItem.precioReferencia),
          currency: "BRL" as const,
        }];
      }),
    }];
  });

  return {
    generatedAt: text(data.generado),
    products,
    categories,
    customers,
    quotes,
    stats: {
      total: number(rawStats.total, products.length),
      published: number(rawStats.publicados),
      pending: number(rawStats.pendientes),
      hidden: number(rawStats.ocultos),
      drafts: number(rawStats.borradores),
      categories: number(rawStats.categorias, categories.filter((item) => item.active).length),
      withoutImage: number(rawStats.sinImagen),
      incomplete: number(rawStats.incompletos),
    },
  };
}

async function requestAdminSnapshot(timeoutMs: number) {
  try {
    const config = getGoogleSheetsQuoteConfig();
    const response = await fetch(config.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accion: "admin_datos", apiToken: config.token }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Apps Script respondeu ${response.status}.`);
    return adminSnapshotFromApi(await response.json());
  } catch {
    return null;
  }
}

async function refreshAdminSnapshot() {
  // O primeiro acesso pode acordar o Apps Script. Uma segunda tentativa curta
  // aproveita a instância já aquecida sem deixar o painel preso indefinidamente.
  const snapshot = await requestAdminSnapshot(45_000)
    ?? await requestAdminSnapshot(20_000);
  if (snapshot) {
    recentSnapshot = { value: snapshot, expiresAt: Date.now() + SNAPSHOT_TTL_MS };
    return snapshot;
  }
  // Se o Google oscilar durante uma atualização, mantém a última leitura válida.
  return recentSnapshot?.value ?? null;
}

export async function getSheetsAdminSnapshot(): Promise<SheetsAdminSnapshot | null> {
  if (!hasGoogleSheetsQuoteConfig()) return null;
  if (recentSnapshot && recentSnapshot.expiresAt > Date.now()) return recentSnapshot.value;
  if (pendingSnapshot) return pendingSnapshot;
  pendingSnapshot = refreshAdminSnapshot().finally(() => {
    pendingSnapshot = null;
  });
  return pendingSnapshot;
}

/* ------------------------------------------------------------------ custos */

export interface SheetsAdminCost {
  code: string;
  cost: number | null;
  supplier: string;
  notes: string;
  updatedAt: string;
  version: string;
}

export function costsFromApi(payload: unknown): Map<string, SheetsAdminCost> {
  const root = record(payload);
  if (root.ok !== true) throw new Error("Resposta inválida dos custos.");
  const costs = new Map<string, SheetsAdminCost>();
  for (const value of list(root.costos)) {
    const item = record(value);
    const code = text(item.codigo).toUpperCase();
    if (!code || costs.has(code)) continue;
    costs.set(code, {
      code,
      cost: price(item.costo),
      supplier: text(item.proveedor),
      notes: text(item.notas),
      updatedAt: text(item.fechaActualizacion),
      version: text(item.version),
    });
  }
  return costs;
}

/**
 * Custos internos. Só chamar depois de confirmar `costs:read` no servidor.
 * Usa o token de administração e não fica em cache compartilhado.
 */
export async function getSheetsCosts(): Promise<Map<string, SheetsAdminCost> | null> {
  const response = await callAppsScript("admin_costos", {}, { token: "admin" });
  if (!response?.ok) return null;
  try {
    return costsFromApi(response);
  } catch {
    return null;
  }
}
