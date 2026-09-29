"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import type { DemoProduct } from "./demo-products";

const FEATURED_COUNT = 8;

function formatPrice(product: DemoProduct) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: product.currency,
  }).format(product.price ?? 0);
}

function ProductCard({ product }: { product: DemoProduct }) {
  const href = `/catalogo/${encodeURIComponent(product.code)}`;
  return (
    <article className="product-card">
      <Link href={href} className="product-image" tabIndex={-1} aria-hidden="true">
        <Image
          src={product.image}
          alt=""
          fill
          sizes="(max-width: 800px) 50vw, (max-width: 1050px) 33vw, 25vw"
        />
        <span>{product.category}</span>
      </Link>
      <div className="product-content">
        <p className="product-code">CÓD. {product.code}</p>
        <h3>
          <Link href={href}>{product.name}</Link>
        </h3>
        <p>{product.description}</p>
        <div className="product-price">
          {product.price !== null ? (
            <strong>{formatPrice(product)}</strong>
          ) : (
            <span>Preço sob consulta</span>
          )}
          <Link href={href} aria-label={`Solicitar orçamento de ${product.name}`}>
            Solicitar orçamento <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * variant="featured": vitrine da página inicial (sem busca nem filtros,
 * 8 produtos e link para o catálogo completo).
 */
export function Catalog({
  products,
  variant = "full",
}: {
  products: DemoProduct[];
  variant?: "full" | "featured";
}) {
  if (variant === "featured") {
    const featured = products.slice(0, FEATURED_COUNT);
    return (
      <section id="catalogo" className="catalog-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">COLEÇÃO PILOTO · LINHA ECOLÓGICA</p>
            <h2>Presentes com propósito</h2>
          </div>
          <Link className="button outline" href="/catalogo">
            Ver catálogo completo <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard key={product.code} product={product} />
          ))}
        </div>
        {products.length > featured.length && (
          <div className="catalog-more">
            <Link className="button" href="/catalogo">
              Ver os {products.length} produtos <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </section>
    );
  }

  return <FullCatalog products={products} />;
}

function FullCatalog({ products }: { products: DemoProduct[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((item) => item.category)))],
    [products],
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

    return products.filter((product) => {
      const matchesCategory =
        category === "Todos" || product.category === category;
      const searchable =
        `${product.name} ${product.code} ${product.category}`.toLocaleLowerCase(
          "pt-BR",
        );
      return (
        matchesCategory &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [category, products, query]);

  const clearFilters = () => {
    setQuery("");
    setCategory("Todos");
  };

  return (
    <section id="catalogo" className="catalog-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">COLEÇÃO PILOTO · LINHA ECOLÓGICA</p>
          <h2>Presentes com propósito</h2>
        </div>
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Buscar produtos"
            placeholder="Buscar por produto ou código"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Limpar busca">
              ×
            </button>
          )}
        </label>
      </div>

      <div className="category-filters" aria-label="Filtrar por categoria">
        {categories.map((item) => (
          <button
            key={item}
            className={item === category ? "chip active" : "chip"}
            aria-pressed={item === category}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="catalog-toolbar">
        <span>Seleção para apresentação</span>
        <span>
          {visibleProducts.length}{" "}
          {visibleProducts.length === 1 ? "produto" : "produtos"}
        </span>
      </div>

      {visibleProducts.length > 0 ? (
        <div className="product-grid">
          {visibleProducts.map((product) => (
            <ProductCard key={product.code} product={product} />
          ))}
        </div>
      ) : (
        <>
          <EmptyState
            title="Nenhum resultado encontrado"
            description={`Não encontramos produtos para “${query || category}”. Tente outra busca.`}
          />
          <button className="text-button" onClick={clearFilters}>
            Limpar filtros
          </button>
        </>
      )}
    </section>
  );
}
