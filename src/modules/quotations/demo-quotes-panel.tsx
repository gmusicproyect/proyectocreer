"use client";

import { EmptyState } from "@/components/empty-state";
import { useDemoQuoteRequests } from "./use-demo-store";

export function DemoQuotesPanel({ compact = false }: { compact?: boolean }) {
  const requests = useDemoQuoteRequests();
  const visibleRequests = compact ? requests.slice(0, 2) : requests;

  if (requests.length === 0) {
    return (
      <EmptyState
        title="Novas conexões começam em breve"
        description="As solicitações registradas no laboratório aparecerão aqui."
      />
    );
  }

  return (
    <div className="demo-requests">
      {visibleRequests.map((request) => (
        <article className="demo-request" key={request.id}>
          <div className="demo-request-heading">
            <div>
              <span>{request.id}</span>
              <h3>{request.customer.company}</h3>
              <p>
                {request.customer.name} · {request.customer.email} ·{" "}
                {request.customer.phone}
              </p>
            </div>
            <span className="request-status">{request.status}</span>
          </div>
          <div className="request-items">
            {request.items.map((item) => (
              <div key={item.id}>
                <span>{item.quantity}×</span>
                <strong>{item.name}</strong>
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
            }).format(new Date(request.createdAt))}
          </footer>
        </article>
      ))}
    </div>
  );
}
