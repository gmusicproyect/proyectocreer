import { hasSupabaseConfig } from "@/lib/supabase/config";

export function hasGoogleSheetsQuoteConfig() {
  return Boolean(
    process.env.GOOGLE_QUOTE_WEB_APP_URL &&
      process.env.GOOGLE_QUOTE_API_TOKEN,
  );
}

export function hasQuotePersistenceConfig() {
  return hasGoogleSheetsQuoteConfig() || hasSupabaseConfig();
}

export function getGoogleSheetsQuoteConfig() {
  const url = process.env.GOOGLE_QUOTE_WEB_APP_URL;
  const token = process.env.GOOGLE_QUOTE_API_TOKEN;
  if (!url || !token) {
    throw new Error("A recepção de orçamentos no Google Sheets não está configurada.");
  }
  return { url, token };
}
