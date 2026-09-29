/**
 * Llamadas del SERVIDOR de la web a la aplicación web de Apps Script.
 * Solo se importa desde componentes de servidor y server actions: los tokens
 * viven en variables de entorno y nunca se envían al navegador.
 *
 *   token "read"  -> GOOGLE_QUOTE_API_TOKEN   (catálogo, cotizaciones, lectura del panel)
 *   token "admin" -> GOOGLE_ADMIN_WRITE_TOKEN (escrituras del panel y costos internos)
 */
import { getGoogleSheetsQuoteConfig, hasGoogleSheetsQuoteConfig } from "../quotes/config.ts";

export type ScriptToken = "read" | "admin";

export interface ScriptResponse {
  ok: boolean;
  codigo?: string;
  error?: string;
  [key: string]: unknown;
}

export function hasAdminWriteToken() {
  return hasGoogleSheetsQuoteConfig() && Boolean(process.env.GOOGLE_ADMIN_WRITE_TOKEN?.trim());
}

/**
 * Devuelve la respuesta de Apps Script o `null` si no hubo respuesta válida
 * (sin configuración, red caída, tiempo agotado o JSON inválido).
 */
export async function callAppsScript(
  accion: string,
  payload: Record<string, unknown>,
  { token = "admin", timeoutMs = 30000 }: { token?: ScriptToken; timeoutMs?: number } = {},
): Promise<ScriptResponse | null> {
  if (!hasGoogleSheetsQuoteConfig()) return null;
  const config = getGoogleSheetsQuoteConfig();
  const apiToken = token === "admin" ? process.env.GOOGLE_ADMIN_WRITE_TOKEN?.trim() : config.token;
  if (!apiToken) return null;
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, accion, apiToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as unknown;
    if (!data || typeof data !== "object" || typeof (data as ScriptResponse).ok !== "boolean") return null;
    return data as ScriptResponse;
  } catch {
    return null;
  }
}
