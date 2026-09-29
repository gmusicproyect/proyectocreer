import { PublicShell } from "@/components/public-shell";
import { Catalog } from "@/modules/catalog/catalog";
import { getCatalogProducts } from "@/modules/catalog/catalog-source";

// El catálogo viene de Apps Script: se regenera como máximo cada 5 minutos,
// aunque la compilación no haya podido leerlo (en ese caso muestra la copia segura).
export const revalidate = 300;

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
