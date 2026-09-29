import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { productsFromApi } from "../src/modules/catalog/catalog-source.ts";

const img = (id: string) => `https://lh3.googleusercontent.com/d/${id}`;

function product(overrides: Record<string, unknown> = {}) {
  return {
    codigo: "00001",
    nombre: "Caneta",
    categoria: "Escritório",
    subcategoria: "Canetas",
    descripcion: "Leve, ecológica",
    precio: null,
    moneda: "BRL",
    imagenes: [img("image-id")],
    estado: "PENDIENTE",
    ...overrides,
  };
}

test("presentation mode shows complete pending products and preserves leading zeros", () => {
  const products = productsFromApi({
    ok: true,
    productos: [product(), product({ codigo: "00002", estado: "OCULTO" })],
  });
  assert.equal(products.length, 1);
  assert.equal(products[0].code, "00001");
  assert.equal(products[0].price, null);
  assert.equal(products[0].image, img("image-id"));
  assert.equal("driveFolder" in products[0], false);
});

test("published mode excludes pending products and keeps numeric prices", () => {
  const products = productsFromApi(
    {
      ok: true,
      productos: [
        product(),
        product({ codigo: "00002", precio: 1234.5, estado: "PUBLICADO" }),
      ],
    },
    "published",
  );
  assert.equal(products.length, 1);
  assert.equal(products[0].code, "00002");
  assert.equal(products[0].price, 1234.5);
});

test("drops incomplete products and images that are not Drive URLs", () => {
  const products = productsFromApi({
    ok: true,
    productos: [
      product({ descripcion: "" }),
      product({ codigo: "00003", imagenes: ["javascript:alert(1)"] }),
      product({ codigo: "00004", precio: -5 }),
    ],
  });
  assert.equal(products.length, 1);
  assert.equal(products[0].code, "00004");
  assert.equal(products[0].price, null);
});

test("rejects error responses from Apps Script", () => {
  assert.throws(() => productsFromApi({ ok: false, error: "x" }));
  assert.throws(() => productsFromApi(null));
});

test("the spreadsheet is never read through the public CSV endpoint", () => {
  const source = readFileSync(
    new URL("../src/modules/catalog/catalog-source.ts", import.meta.url),
    "utf8",
  );
  assert.equal(source.includes("gviz"), false);
  assert.equal(/[A-Za-z0-9_-]{40,}/.test(source), false, "no hardcoded spreadsheet IDs");
});
