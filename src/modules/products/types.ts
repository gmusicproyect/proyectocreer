/** Monetary amounts use integer minor units (centavos), never floating point. */
export interface PublicProduct {
  id: string;
  tenantId: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  imageUrl: string | null;
  priceMinor: number;
  currency: "BRL";
}
/** Persist separately from public catalog data; server-side authorization required. */
export interface ProductCost {
  productId: string;
  tenantId: string;
  costMinor: number;
  supplierId: string | null;
}
export interface Product extends PublicProduct {
  published: boolean;
  stock: number;
}
export function toPublicProduct(product: Product): PublicProduct {
  return {
    id: product.id,
    tenantId: product.tenantId,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    imageUrl: product.imageUrl,
    priceMinor: product.priceMinor,
    currency: product.currency,
  };
}
