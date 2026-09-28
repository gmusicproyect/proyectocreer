import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseCsv,
  productsFromCsv,
} from "../src/modules/catalog/catalog-source.ts";

const headers =
  "CODIGO,NOMBRE,CATEGORIA,SUBCATEGORIA,DESCRIPCION,PRECIO,MONEDA,IMAGEN_PRINCIPAL,IMAGEN_2,IMAGEN_3,ESTADO";

test("CSV parser preserves commas, quotes and line breaks inside quoted cells", () => {
  const rows = parseCsv('A,B\n1,"Caneca, 500 ml"\n2,"Texto ""especial""\nlinha"');
  assert.deepEqual(rows, [
    ["A", "B"],
    ["1", "Caneca, 500 ml"],
    ["2", 'Texto "especial"\nlinha'],
  ]);
});

test("catalog projection exposes presentation products and preserves leading zeros", () => {
  const csv = [
    headers,
    '00001,Caneta,Escritório,Canetas,"Leve, ecológica",,BRL,image-id,,,PENDIENTE',
    "00002,Oculto,Casa,Cozinha,Não publicar,,BRL,private-image,,,OCULTO",
  ].join("\n");
  const products = productsFromCsv(csv);
  assert.equal(products.length, 1);
  assert.equal(products[0].code, "00001");
  assert.equal(products[0].price, null);
  assert.equal(products[0].image, "https://lh3.googleusercontent.com/d/image-id");
  assert.equal("driveFolder" in products[0], false);
});

test("published mode excludes pending products and parses BRL prices", () => {
  const csv = [
    headers,
    "00001,Caneta,Escritório,Canetas,Leve,,BRL,image-1,,,PENDIENTE",
    '00002,Caneca,Bebidas,Canecas,Térmica,"1.234,50",BRL,image-2,,,PUBLICADO',
  ].join("\n");
  const products = productsFromCsv(csv, "published");
  assert.equal(products.length, 1);
  assert.equal(products[0].code, "00002");
  assert.equal(products[0].price, 1234.5);
});
