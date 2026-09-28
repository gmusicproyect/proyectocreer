"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { DemoProduct } from "./demo-products";
import { getDemoProductColors, getDemoProductImages } from "./demo-products";
import { addDemoCartItem } from "@/modules/quotations/demo-store";

export function ProductDetail({ product }: { product: DemoProduct }) {
  const images = getDemoProductImages(product);
  const colors = getDemoProductColors(product.code);
  const [image, setImage] = useState(images[0]);
  const [color, setColor] = useState(colors[0]);
  const [quantity, setQuantity] = useState(50);
  const [personalization, setPersonalization] = useState("");
  const [added, setAdded] = useState(false);
  const priceLabel =
    product.price === null
      ? "Sob consulta"
      : new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: product.currency,
        }).format(product.price);

  const addToQuote = () => {
    addDemoCartItem({
      code: product.code,
      name: product.name,
      image: product.image,
      color,
      quantity,
      personalization: personalization.trim(),
    });
    setAdded(true);
  };

  return (
    <main id="conteudo" className="product-detail-page">
      <Link className="back-link" href="/catalogo">
        ← Voltar ao catálogo
      </Link>
      <div className="product-detail-grid">
        <section className="product-gallery" aria-label="Imagens do produto">
          <div className="product-main-image">
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(max-width: 800px) 100vw, 55vw"
              priority
            />
          </div>
          <div className="product-thumbnails">
            {images.map((item, index) => (
              <button
                key={item}
                className={item === image ? "active" : ""}
                onClick={() => setImage(item)}
                aria-label={`Ver imagem ${index + 1} de ${product.name}`}
                aria-pressed={item === image}
              >
                <Image src={item} alt="" fill sizes="90px" />
              </button>
            ))}
          </div>
        </section>

        <section className="product-configurator">
          <p className="eyebrow">
            {product.category} · CÓD. {product.code}
          </p>
          <h1>{product.name}</h1>
          <p className="product-lead">{product.description}</p>
          <div className="price-callout">
            <span>Preço para esta apresentação</span>
            <strong>{priceLabel}</strong>
            <small>
              {product.price === null
                ? "O valor será confirmado pela equipe comercial."
                : "Preço de referência; quantidade e personalização serão confirmadas no orçamento."}
            </small>
          </div>

          <label className="field">
            <span>Cor ou acabamento</span>
            <select
              value={color}
              onChange={(event) => setColor(event.target.value)}
            >
              {colors.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Quantidade estimada</span>
            <input
              type="number"
              min="1"
              max="9999"
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Number(event.target.value) || 1))
              }
            />
          </label>
          <label className="field">
            <span>Personalização</span>
            <textarea
              rows={3}
              placeholder="Ex.: logo em uma cor, embalagem individual..."
              value={personalization}
              onChange={(event) => setPersonalization(event.target.value)}
            />
          </label>
          <button className="button wide" onClick={addToQuote}>
            Adicionar ao orçamento
          </button>
          {added && (
            <div className="success-note" role="status">
              Produto adicionado.{" "}
              <Link href="/orcamento">Revisar orçamento →</Link>
            </div>
          )}
          <p className="demo-caption">
            Quantidade, acabamento e personalização serão confirmados pela
            equipe comercial.
          </p>
        </section>
      </div>
    </main>
  );
}
