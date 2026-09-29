import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { EmptyState } from "@/components/empty-state";
import { hasAdminWriteToken } from "@/lib/admin/apps-script";
import {
  CategoriesManager,
  CustomersManager,
  PermissionsMatrix,
  ProductEditor,
} from "@/modules/admin/admin-editors";
import { modules } from "@/modules/admin/navigation";
import { getSheetsAdminSnapshot, getSheetsCosts } from "@/modules/admin/sheets-data";
import {
  SheetsCategoriesPanel,
  SheetsCustomersPanel,
  SheetsProductsPanel,
  SheetsQuotesPanel,
} from "@/modules/admin/sheets-panels";
import { logout } from "@/modules/auth/actions";
import {
  canReadSheetsData,
  canUseSheets,
  getAdminAccess,
} from "@/modules/auth/access";
import { rolePermissions } from "@/modules/auth/permissions";
import { demoProducts } from "@/modules/catalog/demo-products";
import { DemoQuotesPanel } from "@/modules/quotations/demo-quotes-panel";
import { LiveQuotesPanel } from "@/modules/quotations/live-quotes-panel";
export const dynamic = "force-dynamic";
function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export default async function Admin({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ criado?: string }>;
}) {
  const access = await getAdminAccess();
  if (!access) redirect("/acesso?erro=acesso");
  const { section = [] } = await params;
  const [slug = "", ...rest] = section;
  const current = modules.find((m) => m.slug === slug);
  // Só "Produtos" tem subpáginas: /admin/produtos/novo e /admin/produtos/<código>.
  if (!current || rest.length > 1 || (rest.length === 1 && current.slug !== "produtos")) notFound();

  // Clientes e cotizações da planilha: só para o tenant dono dela.
  const sheets = canReadSheetsData(access) ? await getSheetsAdminSnapshot() : null;
  // Cada permissão é conferida de novo dentro de cada ação do servidor; aqui só decide o que mostrar.
  const writable = Boolean(sheets) && hasAdminWriteToken();
  const canEdit = writable && canUseSheets(access, "catalog:write");
  const canWriteCustomers = writable && canUseSheets(access, "customers:write");
  const canWriteQuotes = writable && canUseSheets(access, "quotations:write");
  const canReadCosts = writable && canUseSheets(access, "costs:read");
  const canWriteCosts = canReadCosts && canUseSheets(access, "costs:write");
  const costs = canReadCosts && current.slug === "produtos" ? await getSheetsCosts() : null;

  const productPath = rest.length === 1 ? decodeSegment(rest[0]).toUpperCase() : null;
  const creating = productPath === "NOVO";
  const editingProduct = productPath && !creating
    ? sheets?.products.find((product) => product.code === productPath) ?? null
    : null;
  if (productPath && (!canEdit || (!creating && !editingProduct))) notFound();
  const { criado } = await searchParams;
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <Brand />
        <p className="eyebrow">ESPAÇO DE GESTÃO</p>
        <nav aria-label="Administração">
          {modules.map((m) => (
            <Link
              key={m.slug}
              href={`/admin/${m.slug}`}
              aria-current={m.slug === current.slug ? "page" : undefined}
            >
              <span aria-hidden="true">{m.glyph}</span>
              {m.name}
            </Link>
          ))}
        </nav>
        <Link className="sidebar-bottom" href="/">
          ↗ Ver catálogo público
        </Link>
      </aside>
      <div className="admin-body">
        <header className="admin-header">
          <span>
            Administração{" "}
            <span className="muted">
              / {access.mode === "supabase" ? access.tenantName : "Creer"}
            </span>
          </span>
          <div className="admin-session">
            <span className="badge">
              {access.mode === "preview" ? "Prévia local" : access.role}
            </span>
            {access.mode === "supabase" && (
              <form action={logout}>
                <button className="logout-button" type="submit">
                  Sair
                </button>
              </form>
            )}
          </div>
        </header>
        <main id="conteudo" className="admin-main">
          <div className="notice compact">
            {sheets
              ? writable
                ? "Dados sincronizados da planilha privada de Gmusic. As alterações salvas aqui vão direto para a planilha."
                : "Dados sincronizados da planilha privada de Gmusic · edição pelo painel ainda não configurada (somente leitura)."
              : "Laboratório de apresentação · a conexão administrativa com a planilha está indisponível."}
          </div>
          <p className="eyebrow">
            CREER / {current.name.toLocaleUpperCase("pt-BR")}
          </p>
          <h1>{current.name}</h1>
          <p className="muted">{current.description}</p>
          {productPath ? (
            <ProductEditor
              product={editingProduct}
              categories={sheets?.categories ?? []}
              cost={editingProduct ? costs?.get(editingProduct.code) ?? null : null}
              canReadCosts={canReadCosts && costs !== null}
              canWriteCosts={canWriteCosts && costs !== null}
              created={criado === "1"}
            />
          ) : !current.slug ? (
            <>
              <div className="stats">
                {[
                  {
                    label: "Produtos na coleção piloto",
                    value: sheets?.stats.total ?? demoProducts.length,
                    note: "Linha ecológica",
                  },
                  {
                    label: "Orçamentos recebidos",
                    value: sheets?.quotes.length ?? 0,
                    note: sheets ? "Na planilha privada" : "Ainda sem registros",
                  },
                  {
                    label: "Clientes cadastrados",
                    value: sheets?.customers.length ?? 0,
                    note: sheets ? "Na planilha privada" : "Ainda sem registros",
                  },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p>{stat.label}</p>
                    <strong>{stat.value}</strong>
                    <span>{stat.note}</span>
                  </div>
                ))}
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Orçamentos recentes</h2>
                  <Link href="/admin/orcamentos">Ver todos ↗</Link>
                </div>
                {sheets ? (
                  <SheetsQuotesPanel quotes={sheets.quotes} compact />
                ) : access.mode === "supabase" ? (
                  <LiveQuotesPanel tenantId={access.tenantId} compact />
                ) : (
                  <DemoQuotesPanel compact />
                )}
              </section>
              <div className="admin-bottom">
                <h2>Um lugar para cada detalhe.</h2>
                <p>Catálogo, relacionamento e gestão conectados.</p>
                <Link className="text-button" href="/admin/produtos">
                  Conhecer a área de produtos ↗
                </Link>
              </div>
            </>
          ) : (
            <section className="panel module-panel">
              <div className="panel-heading">
                <h2>{current.name}</h2>
                {current.slug === "produtos" && canEdit && (
                  <Link className="button small" href="/admin/produtos/novo">
                    + Novo produto
                  </Link>
                )}
                <span className="badge">
                  {current.slug === "produtos"
                    ? `${sheets?.products.length ?? demoProducts.length} produtos`
                    : current.slug === "orcamentos"
                      ? `${sheets?.quotes.length ?? 0} solicitações`
                      : current.slug === "clientes"
                        ? `${sheets?.customers.length ?? 0} clientes`
                        : current.slug === "categorias"
                          ? `${sheets?.categories.length ?? 0} categorias`
                          : current.slug === "equipe"
                            ? "4 papéis"
                            : "Em preparação"}
                </span>
              </div>
              {current.slug === "produtos" ? (
                sheets ? (
                  <SheetsProductsPanel products={sheets.products} canEdit={canEdit} costs={costs} />
                ) : (
                  <div className="admin-product-list">
                    {demoProducts.map((product) => (
                      <div className="admin-product-row" key={product.code}>
                        <div>
                          <strong>{product.name}</strong>
                          <span>Cód. {product.code} · {product.category}</span>
                        </div>
                        <span className="price-pending">Preço a definir</span>
                      </div>
                    ))}
                  </div>
                )
              ) : current.slug === "categorias" && sheets ? (
                canEdit ? (
                  <CategoriesManager categories={sheets.categories} canEdit />
                ) : (
                  <SheetsCategoriesPanel categories={sheets.categories} />
                )
              ) : current.slug === "clientes" && sheets ? (
                canWriteCustomers ? (
                  <CustomersManager customers={sheets.customers} canEdit />
                ) : (
                  <SheetsCustomersPanel customers={sheets.customers} />
                )
              ) : current.slug === "equipe" ? (
                <PermissionsMatrix matrix={rolePermissions} />
              ) : current.slug === "orcamentos" ? (
                sheets ? (
                  <SheetsQuotesPanel quotes={sheets.quotes} canEdit={canWriteQuotes} />
                ) : access.mode === "supabase" ? (
                  <LiveQuotesPanel tenantId={access.tenantId} />
                ) : (
                  <DemoQuotesPanel />
                )
              ) : (
                <EmptyState
                  title={
                    current.slug === "assinatura"
                      ? "Plano ainda não configurado"
                      : "Tudo pronto para começar"
                  }
                  description={
                    current.slug === "assinatura"
                      ? "A assinatura reunirá uso do sistema, hospedagem, suporte e manutenção. Nenhuma cobrança está ativa."
                      : "Este espaço será conectado nas próximas etapas. Nenhum registro foi adicionado."
                  }
                />
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
