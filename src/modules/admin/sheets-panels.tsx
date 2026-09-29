import { EmptyState } from "@/components/empty-state";
import type {
  SheetsAdminCategory,
  SheetsAdminCustomer,
  SheetsAdminProduct,
  SheetsAdminQuote,
} from "./sheets-data";

const statusLabels: Record<string, string> = {
  NUEVA: "Nova",
  EN_ANALISIS: "Em análise",
  COTIZADA: "Cotada",
  APROBADA: "Aprovada",
  RECHAZADA: "Recusada",
  PUBLICADO: "Publicado",
  PENDIENTE: "Pendente",
  BORRADOR: "Rascunho",
  OCULTO: "Oculto",
};

function formatPrice(value: number | null) {
  return value === null
    ? "Preço a definir"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function SheetsProductsPanel({ products }: { products: SheetsAdminProduct[] }) {
  if (!products.length) {
    return <EmptyState title="Nenhum produto cadastrado" description="Os produtos da planilha aparecerão aqui." />;
  }
  return (
    <div className="admin-data-list">
      {products.map((product) => (
        <article className="admin-data-row" key={product.code}>
          <div className="admin-data-main">
            <strong>{product.name}</strong>
            <span>Cód. {product.code} · {product.category || "Sem categoria"}</span>
          </div>
          <div className="admin-data-meta">
            <strong>{formatPrice(product.price)}</strong>
            <span className={`data-status status-${product.state.toLowerCase()}`}>
              {statusLabels[product.state] ?? product.state}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function SheetsCategoriesPanel({ categories }: { categories: SheetsAdminCategory[] }) {
  if (!categories.length) {
    return <EmptyState title="Nenhuma categoria cadastrada" description="As categorias da planilha aparecerão aqui." />;
  }
  return (
    <div className="admin-data-list">
      {categories.map((category) => (
        <article className="admin-data-row" key={category.id || category.slug || category.name}>
          <div className="admin-data-main">
            <strong>{category.name}</strong>
            <span>{category.description || `Ordem ${category.order}`}</span>
          </div>
          <span className={`data-status ${category.active ? "status-publicado" : "status-oculto"}`}>
            {category.active ? "Ativa" : "Inativa"}
          </span>
        </article>
      ))}
    </div>
  );
}

export function SheetsCustomersPanel({ customers }: { customers: SheetsAdminCustomer[] }) {
  if (!customers.length) {
    return <EmptyState title="Nenhum cliente cadastrado" description="Os contatos das solicitações aparecerão aqui." />;
  }
  return (
    <div className="admin-data-list">
      {customers.map((customer) => (
        <article className="admin-data-row" key={customer.id || customer.email}>
          <div className="admin-data-main">
            <strong>{customer.company || customer.name || "Cliente"}</strong>
            <span>{customer.name}{customer.email ? ` · ${customer.email}` : ""}</span>
          </div>
          <div className="admin-data-meta">
            <strong>{customer.phone || "Sem telefone"}</strong>
            <span>{formatDate(customer.createdAt)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function SheetsQuotesPanel({
  quotes,
  compact = false,
}: {
  quotes: SheetsAdminQuote[];
  compact?: boolean;
}) {
  const visible = compact ? quotes.slice(0, 2) : quotes;
  if (!visible.length) {
    return <EmptyState title="Novas conexões começam em breve" description="As solicitações enviadas pelo catálogo aparecerão aqui." />;
  }
  return (
    <div className="demo-requests">
      {visible.map((quote) => (
        <article className="demo-request" key={quote.id || quote.reference}>
          <div className="demo-request-heading">
            <div>
              <span>{quote.reference}</span>
              <h3>{quote.contact.company || "Empresa não informada"}</h3>
              <p>
                {quote.contact.name}
                {quote.contact.email ? ` · ${quote.contact.email}` : ""}
                {quote.contact.phone ? ` · ${quote.contact.phone}` : ""}
              </p>
            </div>
            <span className="request-status">{statusLabels[quote.status] ?? quote.status}</span>
          </div>
          <div className="request-items">
            {quote.items.map((item, index) => (
              <div key={`${quote.reference}-${item.code}-${index}`}>
                <span>{item.quantity}×</span>
                <strong>{item.name || item.code}</strong>
                <small>
                  {[item.finish, item.personalization].filter(Boolean).join(" · ") || "Sem detalhes adicionais"}
                </small>
              </div>
            ))}
          </div>
          {quote.notes && <p className="request-notes">“{quote.notes}”</p>}
          <footer>Registrado em {formatDate(quote.createdAt)}</footer>
        </article>
      ))}
    </div>
  );
}
