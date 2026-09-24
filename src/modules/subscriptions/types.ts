export interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  status: "pending" | "active" | "past_due" | "canceled";
  monthlyPriceMinor: number;
  currency: "BRL";
  renewalAt: string | null;
}
