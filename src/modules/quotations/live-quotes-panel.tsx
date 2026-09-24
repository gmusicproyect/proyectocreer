import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";

const statusLabels: Record<string, string> = {
  new: "Nova",
  reviewing: "Em análise",
  quoted: "Cotada",
  approved: "Aprovada",
  rejected: "Recusada",
  expired: "Expirada",
};

export async function LiveQuotesPanel({
  tenantId,
  compact = false,
}: {
  tenantId: string;
  compact?: boolean;
}) {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("quotation_requests")
    .select(
      "id, reference, status, company_name, contact_name, email, phone, notes, created_at, quotation_items(id, product_name, quantity, color, personalization)",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(compact ? 2 : 50);

  if (!requests?.length) {
    return (
      <EmptyState
        title="Novas conexões começam em breve"
        description="As solicitações enviadas pelo catálogo aparecerão aqui."
      />
    );
  }

  return (
    <div className="demo-requests">
      {requests.map((request) => (
        <article className="demo-request" key={request.id}>
          <div className="demo-request-heading">
            <div>
              <span>{request.reference}</span>
              <h3>{request.company_name}</h3>
              <p>
                {request.contact_name} · {request.email}
                {request.phone ? ` · ${request.phone}` : ""}
              </p>
            </div>
            <span className="request-status">
              {statusLabels[request.status] ?? request.status}
            </span>
          </div>
          <div className="request-items">
            {request.quotation_items.map((item) => (
              <div key={item.id}>
                <span>{item.quantity}×</span>
                <strong>{item.product_name}</strong>
                <small>
                  {item.color}
                  {item.personalization ? ` · ${item.personalization}` : ""}
                </small>
              </div>
            ))}
          </div>
          {request.notes && <p className="request-notes">“{request.notes}”</p>}
          <footer>
            Registrado em{" "}
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(request.created_at))}
          </footer>
        </article>
      ))}
    </div>
  );
}
