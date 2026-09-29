import { PublicShell } from "@/components/public-shell";
import { hasQuotePersistenceConfig } from "@/lib/quotes/config";
import { QuoteBuilder } from "@/modules/quotations/quote-builder";

export default function Page() {
  return (
    <PublicShell>
      <QuoteBuilder remote={hasQuotePersistenceConfig()} />
    </PublicShell>
  );
}
