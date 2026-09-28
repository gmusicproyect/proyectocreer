import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { getCatalogProduct } from "@/modules/catalog/catalog-source";
import { ProductDetail } from "@/modules/catalog/product-detail";

interface ProductPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { code } = await params;
  const product = await getCatalogProduct(code);
  return product
    ? { title: product.name, description: product.description }
    : { title: "Produto" };
}

export default async function Page({ params }: ProductPageProps) {
  const { code } = await params;
  const product = await getCatalogProduct(code);
  if (!product) notFound();

  return (
    <PublicShell>
      <ProductDetail product={product} />
    </PublicShell>
  );
}
