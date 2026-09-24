import { PublicShell } from "@/components/public-shell";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { QuoteBuilder } from "@/modules/quotations/quote-builder";

export default function Page() {
  return (
    <PublicShell>
      <QuoteBuilder remote={hasSupabaseConfig()} />
    </PublicShell>
  );
}
