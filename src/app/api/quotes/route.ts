import { NextResponse } from "next/server";

import {
  getGoogleSheetsQuoteConfig,
  hasGoogleSheetsQuoteConfig,
} from "@/lib/quotes/config";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

interface QuotePayload {
  customer?: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  notes?: string;
  items?: Array<{
    code?: string;
    quantity?: number;
    color?: string;
    personalization?: string;
  }>;
}

export async function POST(request: Request) {
  if (!hasGoogleSheetsQuoteConfig() && !hasSupabaseConfig()) {
    return NextResponse.json({ error: "Banco de dados indisponível." }, { status: 503 });
  }

  let payload: QuotePayload;
  try {
    payload = (await request.json()) as QuotePayload;
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }

  const { customer, items, notes } = payload;
  if (
    !customer?.name?.trim() ||
    !customer.company?.trim() ||
    !customer.email?.trim() ||
    !customer.phone?.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim()) ||
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 50
  ) {
    return NextResponse.json({ error: "Preencha os dados obrigatórios." }, { status: 400 });
  }

  if (hasGoogleSheetsQuoteConfig()) {
    try {
      const config = getGoogleSheetsQuoteConfig();
      const response = await fetch(config.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, apiToken: config.token }),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        id?: string;
        error?: string;
      };
      if (!response.ok || !result.ok || !result.id) {
        throw new Error(result.error ?? "Resposta inválida do Google Sheets.");
      }
      return NextResponse.json({ id: result.id }, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "Não foi possível registrar a solicitação. Tente novamente." },
        { status: 502 },
      );
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quote", {
    p_tenant_slug: "creer",
    p_company_name: customer.company,
    p_contact_name: customer.name,
    p_email: customer.email,
    p_phone: customer.phone ?? "",
    p_notes: notes ?? "",
    p_items: items.map((item) => ({
      sku: item.code,
      quantity: item.quantity,
      color: item.color,
      personalization: item.personalization,
    })),
  });

  const result = Array.isArray(data) ? data[0] : data;
  if (error || !result) {
    return NextResponse.json(
      { error: "Não foi possível registrar a solicitação. Tente novamente." },
      { status: 400 },
    );
  }

  return NextResponse.json({ id: result.reference }, { status: 201 });
}
