"use client";

import { startTransition, useActionState, useState, type ReactNode } from "react";

import type { AdminFormState } from "./admin-actions";

type Action = (state: AdminFormState, data: FormData) => Promise<AdminFormState>;

/**
 * Formulário do painel. O envio é manual (e não `<form action>`) para que o
 * React não reinicie os campos depois de salvar. `resetKey` recebe a versão da
 * linha na planilha: quando ela muda (salvou, ou outra pessoa editou), os campos
 * voltam a mostrar os valores reais.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "Salvar",
  pendingLabel = "Salvando…",
  resetKey = "",
  className = "",
  label,
}: {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  resetKey?: string;
  className?: string;
  label?: string;
}) {
  const [state, run, pending] = useActionState<AdminFormState, FormData>(action, null);
  return (
    <form
      className={`admin-form ${className}`.trim()}
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => run(data));
      }}
    >
      <fieldset className="admin-fieldset" disabled={pending} key={resetKey}>
        {children}
      </fieldset>
      <div className="admin-form-actions">
        <button type="submit" className="button small" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
        {state && (
          <p className={state.ok ? "quick-edit-msg ok" : "quick-edit-msg error"} role="status">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

/** Uma imagem do produto: manter, trocar por um link do Drive ou retirar. */
export function ImageActionField({ index, current }: { index: number; current: string }) {
  const [mode, setMode] = useState("mantener");
  const label = index === 0 ? "Imagem principal" : `Imagem ${index + 1}`;
  return (
    <div className="image-field">
      <span className="image-field-label">{label}</span>
      <div className="image-thumb">
        {current ? (
          // Miniatura simples: a URL já é a pública do Google (lh3), sem otimização extra.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" loading="lazy" />
        ) : (
          <span>Sem imagem</span>
        )}
      </div>
      <select
        name={`image${index}`}
        value={mode}
        onChange={(event) => setMode(event.target.value)}
        aria-label={`${label}: o que fazer`}
      >
        <option value="mantener">{current ? "Manter" : "Deixar vazia"}</option>
        <option value="drive">Usar link do Google Drive</option>
        {current && <option value="quitar">Retirar do produto</option>}
      </select>
      {mode === "drive" && (
        <input
          name={`image${index}Link`}
          placeholder="https://drive.google.com/file/d/…"
          aria-label={`${label}: link do Google Drive`}
          maxLength={500}
          autoComplete="off"
          required
        />
      )}
    </div>
  );
}
