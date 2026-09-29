import { demoProducts, type DemoProduct } from "./demo-products.ts";

/**
 * El catálogo se pide al servidor de Apps Script con el token privado.
 * La hoja de cálculo NO necesita estar compartida públicamente: antes se leía
 * con la salida CSV pública de Google, que obliga a abrir TODA la planilla
 * (clientes, cotizaciones, costos) a cualquier persona con el enlace.
 */

export type CatalogMode = "presentation" | "published";

/** Forma que devuelve Apps Script (getProductosCatalogoWeb_). */
interface ApiProduct {
  codigo?: unknown;
  nombre?: unknown;
  categoria?: unknown;
  subcategoria?: unknown;
  descripcion?: unknown;
  precio?: unknown;
  imagenes?: unknown;
  estado?: unknown;
}

const IMAGE_PREFIX = "https://lh3.googleusercontent.com/d/";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Convierte la respuesta de Apps Script en productos de la web.
 * Revalida todo del lado de la web: estado, campos obligatorios y que las
 * imágenes sean URLs de Drive (nunca se confía ciegamente en la respuesta).
 */
export function productsFromApi(
  payload: unknown,
  mode: CatalogMode = "presentation",
): DemoProduct[] {
  const body = payload as { ok?: unknown; productos?: unknown } | null;
  if (!body || body.ok !== true || !Array.isArray(body.productos)) {
    throw new Error("Resposta inválida do catálogo.");
  }

  return (body.productos as ApiProduct[]).flatMap((item) => {
    const state = text(item.estado).toUpperCase();
    const visible =
      state === "PUBLICADO" || (mode === "presentation" && state === "PENDIENTE");
    if (!visible) return [];

    const code = text(item.codigo).toUpperCase();
    const name = text(item.nombre);
    const category = text(item.categoria);
    const description = text(item.descripcion);
    const images = (Array.isArray(item.imagenes) ? item.imagenes : [])
      .map(text)
      .filter((url) => url.startsWith(IMAGE_PREFIX));
    if (!code || !name || !category || !description || !images[0]) return [];

    const price =
      typeof item.precio === "number" && Number.isFinite(item.precio) && item.precio >= 0
        ? item.precio
        : null;

    return [{
      code,
      name,
      category,
      subcategory: text(item.subcategoria),
      description,
      image: images[0],
      images,
      price,
      currency: "BRL" as const,
      state: state as DemoProduct["state"],
    }];
  });
}

function catalogMode(): CatalogMode {
  return process.env.CREER_CATALOG_MODE === "published" ? "published" : "presentation";
}

/** Mismas variables que usa /api/quotes (se leen aquí para que las pruebas no dependan de alias). */
function appsScriptConfig() {
  const url = process.env.GOOGLE_QUOTE_WEB_APP_URL?.trim();
  const token = process.env.GOOGLE_QUOTE_API_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

export async function getCatalogProducts(): Promise<DemoProduct[]> {
  const config = appsScriptConfig();
  if (!config) return demoProducts;
  try {
    const { url, token } = config;
    const mode = catalogMode();
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accion: "catalogo", modo: mode, apiToken: token }),
      cache: "force-cache",
      next: { revalidate: 300, tags: ["catalog"] },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Apps Script respondeu ${response.status}.`);
    const products = productsFromApi(await response.json(), mode);
    return products.length ? products : demoProducts;
  } catch {
    return demoProducts;
  }
}

export async function getCatalogProduct(code: string) {
  const normalizedCode = decodeURIComponent(code).toUpperCase();
  return (await getCatalogProducts()).find(
    (item) => item.code.toUpperCase() === normalizedCode,
  );
}
