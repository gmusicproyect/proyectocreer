"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient(url, key);
}

export function createRecoveryClient() {
  const { url, key } = getSupabaseConfig();
  // The recovery screen removes the URL fragment and sets the session itself.
  return createBrowserClient(url, key, {
    isSingleton: false,
    auth: { detectSessionInUrl: false },
  });
}
