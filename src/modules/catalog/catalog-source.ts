import { demoProducts, type DemoProduct } from "./demo-products.ts";

const DEFAULT_SPREADSHEET_ID =
  "11qPEgjhT9DvJizg4HzOP41YT51iFeHiisUI-3ostzZ4";

const PUBLIC_COLUMNS = [
  "CODIGO",
  "NOMBRE",
  "CATEGORIA",
  "SUBCATEGORIA",
  "DESCRIPCION",
  "PRECIO",
  "MONEDA",
  "IMAGEN_PRINCIPAL",
  "IMAGEN_2",
  "IMAGEN_3",
  "ESTADO",
] as const;

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function driveImage(id: string) {
  return id
    ? `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}`
    : "";
}

function parsePrice(value: string) {
  const source = value.trim();
  const normalized = source.includes(",")
    ? source.replace(/\./g, "").replace(",", ".")
    : source;
  if (!normalized) return null;
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export function productsFromCsv(
  csv: string,
  mode: "presentation" | "published" = "presentation",
): DemoProduct[] {
  const [headers = [], ...rows] = parseCsv(csv);
  const index = new Map(
    headers.map((header, position) => [header.trim().toUpperCase(), position]),
  );
  if (PUBLIC_COLUMNS.some((header) => index.get(header) === undefined)) {
    throw new Error("A planilha não contém todas as colunas públicas esperadas.");
  }

  const value = (row: string[], header: (typeof PUBLIC_COLUMNS)[number]) =>
    row[index.get(header)!]?.trim() ?? "";

  return rows.flatMap((row) => {
    const state = value(row, "ESTADO").toUpperCase();
    const visible =
      state === "PUBLICADO" ||
      (mode === "presentation" && state === "PENDIENTE");
    if (!visible) return [];

    const code = value(row, "CODIGO").toUpperCase();
    const name = value(row, "NOMBRE");
    const category = value(row, "CATEGORIA");
    const description = value(row, "DESCRIPCION");
    const imageIds = [
      value(row, "IMAGEN_PRINCIPAL"),
      value(row, "IMAGEN_2"),
      value(row, "IMAGEN_3"),
    ].filter(Boolean);
    if (!code || !name || !category || !description || !imageIds[0]) return [];

    const images = imageIds.map(driveImage);
    return [{
      code,
      name,
      category,
      subcategory: value(row, "SUBCATEGORIA"),
      description,
      image: images[0],
      images,
      price: parsePrice(value(row, "PRECIO")),
      currency: "BRL" as const,
      state: state as DemoProduct["state"],
    }];
  });
}

function sheetCsvUrl() {
  const spreadsheetId =
    process.env.GOOGLE_CATALOG_SPREADSHEET_ID?.trim() ||
    DEFAULT_SPREADSHEET_ID;
  const params = new URLSearchParams({ tqx: "out:csv", sheet: "PRODUCTOS" });
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?${params}`;
}

export async function getCatalogProducts(): Promise<DemoProduct[]> {
  try {
    const response = await fetch(sheetCsvUrl(), {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`Google Sheets respondeu ${response.status}.`);
    }
    const mode =
      process.env.CREER_CATALOG_MODE === "published"
        ? "published"
        : "presentation";
    const products = productsFromCsv(await response.text(), mode);
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
