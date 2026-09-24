import { NextResponse } from "next/server";

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
  if (!hasSupabaseConfig()) {
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
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 50
  ) {
    return NextResponse.json({ error: "Preencha os dados obrigatórios." }, { status: 400 });
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
