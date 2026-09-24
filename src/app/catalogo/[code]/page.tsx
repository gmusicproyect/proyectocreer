import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { demoProducts, getDemoProduct } from "@/modules/catalog/demo-products";
import { ProductDetail } from "@/modules/catalog/product-detail";

export function generateStaticParams() {
  return demoProducts.map((product) => ({ code: product.code }));
}

interface ProductPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { code } = await params;
  const product = getDemoProduct(code);
  return product
    ? { title: product.name, description: product.description }
    : { title: "Produto" };
}

export default async function Page({ params }: ProductPageProps) {
  const { code } = await params;
  const product = getDemoProduct(code);
  if (!product) notFound();

  return (
    <PublicShell>
      <ProductDetail product={product} />
    </PublicShell>
  );
}
