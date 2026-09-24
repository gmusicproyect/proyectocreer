export interface Customer {
  id: string;
  tenantId: string;
  company: string;
  contactName: string;
  email: string;
  phone: string | null;
}
