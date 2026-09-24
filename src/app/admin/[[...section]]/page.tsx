import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { EmptyState } from "@/components/empty-state";
import { modules } from "@/modules/admin/navigation";
import { logout } from "@/modules/auth/actions";
import { getAdminAccess } from "@/modules/auth/access";
import { demoProducts } from "@/modules/catalog/demo-products";
import { DemoQuotesPanel } from "@/modules/quotations/demo-quotes-panel";
import { LiveQuotesPanel } from "@/modules/quotations/live-quotes-panel";
export const dynamic = "force-dynamic";
export default async function Admin({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const access = await getAdminAccess();
  if (!access) redirect("/acesso?erro=acesso");
  const { section = [] } = await params;
  const current = modules.find((m) => m.slug === section.join("/"));
  if (!current) notFound();
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
            Laboratório de apresentação · produtos demonstrativos, sem preços
            comerciais definidos.
          </div>
          <p className="eyebrow">
            CREER / {current.name.toLocaleUpperCase("pt-BR")}
          </p>
          <h1>{current.name}</h1>
          <p className="muted">{current.description}</p>
          {!current.slug ? (
            <>
              <div className="stats">
                {[
                  {
                    label: "Produtos na coleção piloto",
                    value: demoProducts.length,
                    note: "Linha ecológica",
                  },
                  {
                    label: "Orçamentos recebidos",
                    value: 0,
                    note: "Ainda sem registros",
                  },
                  {
                    label: "Clientes cadastrados",
                    value: 0,
                    note: "Ainda sem registros",
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
                {access.mode === "supabase" ? (
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
                <span className="badge">
                  {current.slug === "produtos"
                    ? `${demoProducts.length} produtos piloto`
                    : current.slug === "orcamentos"
                      ? "Laboratório ativo"
                      : "Em preparação"}
                </span>
              </div>
              {current.slug === "produtos" ? (
                <div className="admin-product-list">
                  {demoProducts.map((product) => (
                    <div className="admin-product-row" key={product.code}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>
                          Cód. {product.code} · {product.category}
                        </span>
                      </div>
                      <span className="price-pending">Preço a definir</span>
                    </div>
                  ))}
                  <div className="module-note">
                    Lucas poderá definir custo interno e preço de venda quando o
                    módulo de dados estiver conectado.
                  </div>
                </div>
              ) : current.slug === "orcamentos" ? (
                access.mode === "supabase" ? (
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
