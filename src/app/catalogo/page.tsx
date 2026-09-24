import { PublicShell } from "@/components/public-shell";
import { Catalog } from "@/modules/catalog/catalog";
export default function Page() {
  return (
    <PublicShell>
      <main id="conteudo">
        <Catalog />
      </main>
    </PublicShell>
  );
}
