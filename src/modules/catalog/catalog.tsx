"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import type { DemoProduct } from "./demo-products";

export function Catalog({ products }: { products: DemoProduct[] }) {
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
            <article className="product-card" key={product.code}>
              <Link
                href={`/catalogo/${product.code}`}
                className="product-image"
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 25vw"
                />
                <span>{product.category}</span>
              </Link>
              <div className="product-content">
                <p className="product-code">CÓD. {product.code}</p>
                <h3>
                  <Link href={`/catalogo/${product.code}`}>{product.name}</Link>
                </h3>
                <p>{product.description}</p>
                <div className="product-price">
                  <div>
                    <span>Preço</span>
                    <strong>
                      {product.price === null
                        ? "Sob consulta"
                        : new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: product.currency,
                          }).format(product.price)}
                    </strong>
                  </div>
                  <Link href={`/catalogo/${product.code}`}>Ver opções →</Link>
                </div>
              </div>
            </article>
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
