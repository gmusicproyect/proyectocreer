import { PublicShell } from "@/components/public-shell";
import { Catalog } from "@/modules/catalog/catalog";
import { getCatalogProducts } from "@/modules/catalog/catalog-source";

export default async function Page() {
  const products = await getCatalogProducts();
  return (
    <PublicShell>
      <main id="conteudo">
        <Catalog products={products} />
      </main>
    </PublicShell>
  );
}
