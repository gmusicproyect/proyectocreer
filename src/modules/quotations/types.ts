export type QuotationStatus =
  | "requested"
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "expired";
export interface QuotationItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
}
export interface Quotation {
  id: string;
  tenantId: string;
  customerId: string;
  status: QuotationStatus;
  currency: "BRL";
  items: QuotationItem[];
  createdAt: string;
  expiresAt: string | null;
}
