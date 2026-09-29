import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import type { Permission, Role } from "@/modules/auth/permissions";

import {
  saveCategoryAction,
  saveCostAction,
  saveCustomerAction,
  saveProductAction,
  updateQuoteAction,
  uploadImageAction,
} from "./admin-actions";
import { AdminForm, ImageActionField } from "./admin-form";
import { IMAGE_TYPES, marginOf, QUOTE_STATES } from "./admin-forms";
import { priceToInput } from "./product-edit";
import type {
  SheetsAdminCategory,
  SheetsAdminCost,
  SheetsAdminCustomer,
  SheetsAdminProduct,
  SheetsAdminQuote,
} from "./sheets-data";

export const productStateLabels: Record<string, string> = {
  PENDIENTE: "Pendente",
  PUBLICADO: "Publicado",
  OCULTO: "Inativo",
  BORRADOR: "Rascunho",
};

export const quoteStateLabels: Record<string, string> = {
  NUEVA: "Nova",
  EN_ANALISIS: "Em análise",
  COTIZADA: "Cotada",
  APROBADA: "Aprovada",
  RECHAZADA: "Recusada",
};

/** Estados oferecidos no painel. "Rascunho" só aparece se o produto já estiver assim. */
export function productStateOptions(current: string) {
  const base = ["PENDIENTE", "PUBLICADO", "OCULTO"];
  return current === "BORRADOR" ? ["BORRADOR", ...base] : base;
}

export function formatMoney(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatPercent(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

/* ------------------------------------------------------------------ produtos */

export function ProductEditor({
  product,
  categories,
  cost,
  canReadCosts,
  canWriteCosts,
  created = false,
}: {
  product: SheetsAdminProduct | null;
  categories: SheetsAdminCategory[];
  cost: SheetsAdminCost | null;
  canReadCosts: boolean;
  canWriteCosts: boolean;
  created?: boolean;
}) {
  const isNew = !product;
  const state = product?.state ?? "PENDIENTE";
  const categoryNames = categories.map((c) => c.name);
  const unknownCategory = product?.category && !categoryNames.includes(product.category) ? product.category : "";
  const margin = marginOf(product?.price ?? null, cost?.cost ?? null);

  return (
    <div className="editor-stack">
      <Link className="back-link small" href="/admin/produtos">
        ← Voltar para produtos
      </Link>
      {created && <p className="notice compact">Produto criado. Agora você pode enviar as imagens.</p>}

      <section className="editor-card">
        <header>
          <h2>{isNew ? "Novo produto" : product.name}</h2>
          {product && (
            <span className={`data-status status-${product.state.toLowerCase()}`}>
              {productStateLabels[product.state] ?? product.state}
            </span>
          )}
        </header>
        <AdminForm action={saveProductAction} resetKey={product?.updatedAt ?? "novo"} label="Dados do produto">
          <input type="hidden" name="mode" value={isNew ? "crear" : "editar"} />
          <input type="hidden" name="updatedAt" value={product?.updatedAt ?? ""} />
          <div className="form-grid">
            <label>
              <span>Código</span>
              {isNew ? (
                <input name="code" required maxLength={40} placeholder="Ex.: 18839" autoComplete="off" />
              ) : (
                <>
                  <input value={product.code} readOnly aria-readonly="true" />
                  <input type="hidden" name="code" value={product.code} />
                </>
              )}
            </label>
            <label className="span-2">
              <span>Nome</span>
              <input name="name" required maxLength={150} defaultValue={product?.name} />
            </label>
            <label>
              <span>Categoria</span>
              <select name="category" defaultValue={product?.category ?? ""}>
                <option value="">Sem categoria</option>
                {unknownCategory && <option value={unknownCategory}>{unknownCategory} (não cadastrada)</option>}
                {categories.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}{c.active ? "" : " (inativa)"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Subcategoria</span>
              <input name="subcategory" maxLength={80} defaultValue={product?.subcategory} />
            </label>
            <label>
              <span>Preço de venda (R$)</span>
              <input
                name="price"
                inputMode="decimal"
                placeholder="Sob consulta"
                maxLength={20}
                defaultValue={priceToInput(product?.price ?? null)}
                autoComplete="off"
              />
            </label>
            <label>
              <span>Estado</span>
              <select name="state" defaultValue={state}>
                {productStateOptions(state).map((s) => (
                  <option key={s} value={s}>{productStateLabels[s]}</option>
                ))}
              </select>
            </label>
            <label className="checkbox">
              <input type="checkbox" name="featured" defaultChecked={product?.featured} />
              <span>Destaque no catálogo</span>
            </label>
            <label className="span-3">
              <span>Descrição</span>
              <textarea name="description" rows={5} maxLength={5000} defaultValue={product?.description} />
            </label>
            <label className="span-3">
              <span>Notas internas (nunca aparecem no catálogo)</span>
              <textarea name="notes" rows={2} maxLength={1000} defaultValue={product?.notes} />
            </label>
          </div>
          <div className="image-grid">
            {[0, 1, 2].map((i) => (
              <ImageActionField key={i} index={i} current={product?.images[i] ?? ""} />
            ))}
          </div>
          <p className="form-hint">
            Para publicar: nome, categoria, preço, descrição e imagem principal. Enquanto falta algo, deixe como Pendente.
            “Inativo” tira o produto do catálogo sem apagá-lo.
          </p>
        </AdminForm>
      </section>

      {product && (
        <section className="editor-card">
          <header>
            <h2>Enviar imagens</h2>
            <span className="badge">JPG, PNG ou WEBP · até 3 MB</span>
          </header>
          <p className="form-hint">
            A imagem vai para a pasta pública de imagens no Drive, com o nome que o importador reconhece
            ({product.code}.jpg, {product.code}_1.jpg…), e substitui a do espaço escolhido.
          </p>
          <div className="upload-grid">
            {[0, 1, 2].map((slot) => (
              <AdminForm
                key={slot}
                action={uploadImageAction}
                resetKey={product.updatedAt}
                submitLabel="Enviar"
                pendingLabel="Enviando…"
                label={`Enviar imagem ${slot + 1}`}
              >
                <input type="hidden" name="code" value={product.code} />
                <input type="hidden" name="slot" value={slot} />
                <input type="hidden" name="updatedAt" value={product.updatedAt} />
                <label>
                  <span>{slot === 0 ? "Imagem principal" : `Imagem ${slot + 1}`}</span>
                  <input type="file" name="file" accept={IMAGE_TYPES.join(",")} required />
                </label>
              </AdminForm>
            ))}
          </div>
        </section>
      )}

      {product && canReadCosts && (
        <section className="editor-card private-card">
          <header>
            <h2>Custo interno</h2>
            <span className="badge">Privado · nunca vai ao catálogo</span>
          </header>
          <div className="cost-summary">
            <div><span>Preço de venda</span><strong>{formatMoney(product.price)}</strong></div>
            <div><span>Custo</span><strong>{formatMoney(cost?.cost ?? null)}</strong></div>
            <div><span>Margem</span><strong>{formatPercent(margin)}</strong></div>
          </div>
          {canWriteCosts ? (
            <AdminForm action={saveCostAction} resetKey={cost?.version ?? "sem-custo"} label="Custo interno">
              <input type="hidden" name="code" value={product.code} />
              <input type="hidden" name="version" value={cost?.version ?? ""} />
              <div className="form-grid">
                <label>
                  <span>Custo unitário (R$)</span>
                  <input name="cost" inputMode="decimal" maxLength={20} defaultValue={priceToInput(cost?.cost ?? null)} autoComplete="off" />
                </label>
                <label className="span-2">
                  <span>Fornecedor</span>
                  <input name="supplier" maxLength={120} defaultValue={cost?.supplier} placeholder="Ex.: XBZ Brindes" />
                </label>
                <label className="span-3">
                  <span>Notas do custo</span>
                  <textarea name="notes" rows={2} maxLength={1000} defaultValue={cost?.notes} />
                </label>
              </div>
            </AdminForm>
          ) : (
            <p className="form-hint">Seu papel pode ver, mas não alterar custos.</p>
          )}
        </section>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- categorias */

function CategoryFields({ category }: { category?: SheetsAdminCategory }) {
  return (
    <div className="form-grid">
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <input type="hidden" name="version" value={category?.version ?? ""} />
      <label className="span-2">
        <span>Nome</span>
        <input name="name" required maxLength={80} defaultValue={category?.name} />
      </label>
      <label>
        <span>Ordem</span>
        <input name="order" type="number" min={0} max={9999} defaultValue={category ? Math.min(category.order, 9999) : 0} />
      </label>
      <label className="span-2">
        <span>Descrição</span>
        <input name="description" maxLength={500} defaultValue={category?.description} />
      </label>
      <label className="checkbox">
        <input type="checkbox" name="active" defaultChecked={category ? category.active : true} />
        <span>Ativa no catálogo</span>
      </label>
    </div>
  );
}

export function CategoriesManager({ categories, canEdit }: { categories: SheetsAdminCategory[]; canEdit: boolean }) {
  return (
    <div className="admin-data-list">
      {canEdit && (
        <details className="create-box">
          <summary>+ Nova categoria</summary>
          {/* A lista cresce quando a categoria é criada: o formulário volta a ficar vazio. */}
          <AdminForm action={saveCategoryAction} submitLabel="Criar categoria" label="Nova categoria" resetKey={String(categories.length)}>
            <CategoryFields />
          </AdminForm>
        </details>
      )}
      {!categories.length && <EmptyState title="Nenhuma categoria cadastrada" description="As categorias da planilha aparecerão aqui." />}
      {categories.map((category) => (
        <article className="admin-data-row editable" key={category.id || category.name}>
          <div className="admin-data-main">
            <strong>{category.name}</strong>
            <span>
              {category.productCount} produto(s) · ordem {category.order}
              {category.description ? ` · ${category.description}` : ""}
            </span>
          </div>
          <span className={`data-status ${category.active ? "status-publicado" : "status-oculto"}`}>
            {category.active ? "Ativa" : "Inativa"}
          </span>
          {canEdit && (
            <details className="row-editor">
              <summary>Editar</summary>
              <AdminForm action={saveCategoryAction} resetKey={category.version} label={`Editar ${category.name}`}>
                <CategoryFields category={category} />
                {category.productCount > 0 && (
                  <p className="form-hint">Ao renomear, os {category.productCount} produto(s) passam a usar o novo nome.</p>
                )}
              </AdminForm>
            </details>
          )}
        </article>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ clientes */

function CustomerFields({ customer }: { customer?: SheetsAdminCustomer }) {
  return (
    <div className="form-grid">
      <input type="hidden" name="id" value={customer?.id ?? ""} />
      <input type="hidden" name="version" value={customer?.version ?? ""} />
      <label>
        <span>Nome</span>
        <input name="name" maxLength={150} defaultValue={customer?.name} autoComplete="off" />
      </label>
      <label>
        <span>Empresa</span>
        <input name="company" maxLength={150} defaultValue={customer?.company} autoComplete="off" />
      </label>
      <label>
        <span>E-mail</span>
        <input name="email" type="email" required maxLength={254} defaultValue={customer?.email} autoComplete="off" />
      </label>
      <label>
        <span>Telefone</span>
        <input name="phone" maxLength={60} defaultValue={customer?.phone} autoComplete="off" />
      </label>
    </div>
  );
}

export function CustomersManager({ customers, canEdit }: { customers: SheetsAdminCustomer[]; canEdit: boolean }) {
  const duplicates = customers.filter((c) => c.duplicate).length;
  return (
    <div className="admin-data-list">
      {duplicates > 0 && (
        <p className="notice compact warning">
          {duplicates} cadastros usam o mesmo e-mail. Corrija o e-mail de um deles; o sistema não deixa criar novos repetidos.
        </p>
      )}
      {canEdit && (
        <details className="create-box">
          <summary>+ Novo cliente</summary>
          <AdminForm action={saveCustomerAction} submitLabel="Cadastrar cliente" label="Novo cliente" resetKey={String(customers.length)}>
            <CustomerFields />
            <p className="form-hint">Se o e-mail já existir, o cadastro não é duplicado: edite o cliente existente.</p>
          </AdminForm>
        </details>
      )}
      {!customers.length && <EmptyState title="Nenhum cliente cadastrado" description="Os contatos das solicitações aparecerão aqui." />}
      {customers.map((customer) => (
        <article className="admin-data-row editable" key={customer.id || customer.email}>
          <div className="admin-data-main">
            <strong>{customer.company || customer.name || "Cliente"}</strong>
            <span>
              {customer.name}
              {customer.email ? ` · ${customer.email}` : ""}
              {customer.phone ? ` · ${customer.phone}` : ""}
            </span>
          </div>
          <div className="admin-data-meta">
            <strong>{customer.quoteCount} orçamento(s)</strong>
            {customer.duplicate ? (
              <span className="data-status status-pendiente">E-mail repetido</span>
            ) : (
              <span>Desde {formatDate(customer.createdAt)}</span>
            )}
          </div>
          {canEdit && customer.id && (
            <details className="row-editor">
              <summary>Editar</summary>
              <AdminForm action={saveCustomerAction} resetKey={customer.version} label={`Editar ${customer.email}`}>
                <CustomerFields customer={customer} />
              </AdminForm>
            </details>
          )}
        </article>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- orçamentos */

export function QuoteStatusForm({ quote }: { quote: SheetsAdminQuote }) {
  const current = (QUOTE_STATES as readonly string[]).includes(quote.status) ? quote.status : "NUEVA";
  return (
    <details className="row-editor quote-editor">
      <summary>Atualizar situação</summary>
      <AdminForm action={updateQuoteAction} resetKey={quote.version} label={`Situação de ${quote.reference}`}>
        <input type="hidden" name="id" value={quote.id} />
        <input type="hidden" name="version" value={quote.version} />
        <div className="form-grid">
          <label>
            <span>Situação</span>
            <select name="status" defaultValue={current}>
              {QUOTE_STATES.map((s) => (
                <option key={s} value={s}>{quoteStateLabels[s]}</option>
              ))}
            </select>
          </label>
          <label className="span-2">
            <span>Notas internas (o cliente não vê)</span>
            <textarea name="internalNotes" rows={2} maxLength={2000} defaultValue={quote.internalNotes} />
          </label>
        </div>
      </AdminForm>
    </details>
  );
}

/* --------------------------------------------------------- equipe e permissões */

const roleLabels: Record<Role, string> = {
  tenant_admin: "Administrador da Creer",
  sales: "Vendas",
  catalog_editor: "Editor de catálogo",
  provider_owner: "Suporte técnico (desenvolvedor)",
};

const permissionLabels: [Permission, string][] = [
  ["catalog:write", "Produtos, categorias e imagens"],
  ["costs:read", "Ver custos"],
  ["costs:write", "Alterar custos"],
  ["customers:write", "Clientes"],
  ["quotations:write", "Orçamentos"],
  ["team:manage", "Equipe"],
  ["subscription:read", "Ver assinatura"],
];

export function PermissionsMatrix({ matrix }: { matrix: Record<Role, readonly Permission[]> }) {
  const roles = Object.keys(roleLabels) as Role[];
  return (
    <div className="admin-data-list">
      <div className="table-scroll">
        <table className="permissions-table">
          <caption className="sr-only">Permissões por papel</caption>
          <thead>
            <tr>
              <th scope="col">Área</th>
              {roles.map((role) => <th scope="col" key={role}>{roleLabels[role]}</th>)}
            </tr>
          </thead>
          <tbody>
            {permissionLabels.map(([permission, label]) => (
              <tr key={permission}>
                <th scope="row">{label}</th>
                {roles.map((role) => (
                  <td key={role}>
                    {matrix[role].includes(permission) ? <span aria-label="Sim">●</span> : <span className="muted" aria-label="Não">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="module-note">
        Cada operação do painel confere o papel no servidor antes de chegar à planilha. O acesso real de
        pessoas depende do login com Supabase: enquanto o projeto não estiver conectado, o painel só abre
        na prévia local de desenvolvimento, que é bloqueada em produção.
      </p>
    </div>
  );
}
