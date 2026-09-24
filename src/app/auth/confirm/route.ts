import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (!hasSupabaseConfig() || !tokenHash || !type) {
    return NextResponse.redirect(new URL("/acesso?erro=credenciais", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(new URL("/acesso?erro=credenciais", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
