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
  updatedAt: string;
}

export interface SheetsAdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  order: number;
}

export interface SheetsAdminCustomer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
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
      createdAt: text(item.fechaCreacion),
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

export async function getSheetsAdminSnapshot(): Promise<SheetsAdminSnapshot | null> {
  if (!hasGoogleSheetsQuoteConfig()) return null;
  if (recentSnapshot && recentSnapshot.expiresAt > Date.now()) return recentSnapshot.value;
  try {
    const config = getGoogleSheetsQuoteConfig();
    const response = await fetch(config.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accion: "admin_datos", apiToken: config.token }),
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) throw new Error(`Apps Script respondeu ${response.status}.`);
    const snapshot = adminSnapshotFromApi(await response.json());
    recentSnapshot = { value: snapshot, expiresAt: Date.now() + 15000 };
    return snapshot;
  } catch {
    return null;
  }
}
