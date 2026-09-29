"use client";

import { startTransition, useActionState, useState } from "react";

import { updateProductAction, type ProductEditState } from "./product-actions";
import { EDITABLE_STATES } from "./product-edit";

const stateLabels: Record<string, string> = {
  BORRADOR: "Rascunho",
  PENDIENTE: "Pendente",
  PUBLICADO: "Publicado",
  OCULTO: "Oculto",
};

function normalizeState(value: string) {
  return (EDITABLE_STATES as readonly string[]).includes(value) ? value : "PENDIENTE";
}

export function ProductQuickEdit({
  code,
  name,
  priceInput,
  state,
  updatedAt,
  currentLabel,
}: {
  code: string;
  currentLabel: string;
  name: string;
  priceInput: string;
  state: string;
  updatedAt: string;
}) {
  const [result, action, pending] = useActionState<ProductEditState, FormData>(
    updateProductAction,
    null,
  );
  // Campos controlados: o formulário nunca "volta" sozinho a valores antigos
  // (um select não controlado poderia reenviar o estado anterior e despublicar).
  const [price, setPrice] = useState(priceInput);
  const [status, setStatus] = useState(normalizeState(state));
  // Quando a planilha muda (salvou, ou outra pessoa editou), os campos passam a
  // mostrar os valores reais. Padrão do React para ajustar estado a uma prop.
  const [syncedVersion, setSyncedVersion] = useState(updatedAt);
  if (syncedVersion !== updatedAt) {
    setSyncedVersion(updatedAt);
    setPrice(priceInput);
    setStatus(normalizeState(state));
  }

  return (
    <form
      className="quick-edit"
      aria-label={`Editar ${name}`}
      // Envio manual: com <form action> o React reinicia o formulário depois de
      // salvar e o select mostraria um estado que não é o real.
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="updatedAt" value={updatedAt} />
      <label>
        <span>Preço (R$)</span>
        <input
          name="price"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          inputMode="decimal"
          placeholder="Sob consulta"
          maxLength={20}
          autoComplete="off"
        />
      </label>
      <label>
        <span>Estado</span>
        <select name="state" value={status} onChange={(event) => setStatus(event.target.value)}>
          {EDITABLE_STATES.map((item) => (
            <option key={item} value={item}>
              {stateLabels[item]}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="button small" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </button>
      {/* Valor real na planilha (atualiza sozinho após salvar ou após um conflito). */}
      <p className="quick-edit-current">Na planilha: {currentLabel}</p>
      {result && (
        <p className={result.ok ? "quick-edit-msg ok" : "quick-edit-msg error"} role="status">
          {result.message}
        </p>
      )}
    </form>
  );
}
