"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  clearDemoCart,
  createDemoQuoteRequest,
  removeDemoCartItem,
  updateDemoCartQuantity,
  type DemoQuoteCustomer,
  type DemoQuoteRequest,
} from "./demo-store";
import { useDemoCart } from "./use-demo-store";
import { EmptyState } from "@/components/empty-state";

const emptyCustomer: DemoQuoteCustomer = {
  name: "",
  company: "",
  email: "",
  phone: "",
};

interface SentQuote {
  id: string;
  customerName: string;
  remote: boolean;
}

export function QuoteBuilder({ remote = false }: { remote?: boolean }) {
  const cart = useDemoCart();
  const [requestKey] = useState(() => crypto.randomUUID());
  const [customer, setCustomer] = useState(emptyCustomer);
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState<SentQuote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    setSubmitError("");

    if (!remote) {
      const request: DemoQuoteRequest = createDemoQuoteRequest(
        customer,
        notes.trim(),
      );
      setSent({ id: request.id, customerName: request.customer.name, remote });
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestKey,
          customer,
          notes: notes.trim(),
          items: cart,
        }),
      });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !result.id) {
        throw new Error(result.error ?? "Não foi possível registrar a solicitação.");
      }
      clearDemoCart();
      setSent({ id: result.id, customerName: customer.name, remote });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a solicitação.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <main id="conteudo" className="quote-page centered-result">
        <div className="success-mark" aria-hidden="true">
          ✓
        </div>
        <p className="eyebrow">
          {sent.remote ? "SOLICITAÇÃO REGISTRADA" : "SOLICITAÇÃO REGISTRADA NO LABORATÓRIO"}
        </p>
        <h1>Obrigado, {sent.customerName}.</h1>
        <p>
          A solicitação <strong>{sent.id}</strong> foi recebida e já pode ser
          acompanhada no painel administrativo.
        </p>
        {!sent.remote && (
          <div className="notice compact">
            Esta é uma simulação local. Nenhum e-mail ou dado foi enviado para
            fora do seu computador.
          </div>
        )}
        <div className="result-actions">
          <Link className="button" href="/catalogo">
            Continuar no catálogo
          </Link>
          <Link className="button outline" href="/admin/orcamentos">
            Ver no painel
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="conteudo" className="quote-page">
      <p className="eyebrow">SUA SELEÇÃO</p>
      <h1>Solicitar orçamento</h1>
      <p className="quote-intro">
        Revise os produtos e conte um pouco sobre a sua necessidade.
      </p>

      {cart.length === 0 ? (
        <div className="quote-empty">
          <EmptyState
            title="Sua seleção está vazia"
            description="Escolha um produto no catálogo, defina a quantidade e adicione ao orçamento."
          />
          <Link className="button" href="/catalogo">
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <form className="quote-layout" onSubmit={submit}>
          <section className="quote-items" aria-label="Produtos selecionados">
            <div className="quote-section-heading">
              <h2>Produtos</h2>
              <span>
                {cart.length} {cart.length === 1 ? "item" : "itens"}
              </span>
            </div>
            {cart.map((item) => (
              <article className="quote-item" key={item.id}>
                <div className="quote-item-image">
                  <Image src={item.image} alt="" fill sizes="110px" />
                </div>
                <div className="quote-item-info">
                  <p className="product-code">CÓD. {item.code}</p>
                  <h3>{item.name}</h3>
                  <p>
                    {item.color}
                    {item.personalization ? ` · ${item.personalization}` : ""}
                  </p>
                  <label>
                    Quantidade
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={item.quantity}
                      onChange={(event) =>
                        updateDemoCartQuantity(
                          item.id,
                          Number(event.target.value) || 1,
                        )
                      }
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => removeDemoCartItem(item.id)}
                >
                  Remover
                </button>
              </article>
            ))}
            <Link className="text-button" href="/catalogo">
              + Adicionar outro produto
            </Link>
          </section>

          <section className="customer-form">
            <div className="quote-section-heading">
              <h2>Seus dados</h2>
            </div>
            <div className="demo-local-note">
              {remote
                ? "Os dados serão enviados à equipe Creer para preparar o orçamento."
                : "Demonstração: estes dados ficam somente neste navegador."}
            </div>
            <label className="field">
              <span>Nome</span>
              <input
                required
                autoComplete="name"
                value={customer.name}
                onChange={(event) =>
                  setCustomer({ ...customer, name: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Empresa</span>
              <input
                required
                autoComplete="organization"
                value={customer.company}
                onChange={(event) =>
                  setCustomer({ ...customer, company: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={customer.email}
                onChange={(event) =>
                  setCustomer({ ...customer, email: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Telefone</span>
              <input
                required
                type="tel"
                autoComplete="tel"
                value={customer.phone}
                onChange={(event) =>
                  setCustomer({ ...customer, phone: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Observações</span>
              <textarea
                rows={4}
                placeholder="Prazo, evento, local de entrega..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            {submitError && <p className="form-error">{submitError}</p>}
            <button className="button wide" type="submit" disabled={submitting}>
              {submitting
                ? "Registrando..."
                : remote
                  ? "Enviar solicitação"
                  : "Registrar solicitação de demonstração"}
            </button>
          </section>
        </form>
      )}
    </main>
  );
}
