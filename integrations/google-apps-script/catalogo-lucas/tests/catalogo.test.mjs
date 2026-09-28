import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });

for (const file of ["Config.gs", "Productos.gs", "DriveImporter.gs", "Api.gs"]) {
  vm.runInContext(readFileSync(new URL(file, root), "utf8"), context, {
    filename: file,
  });
}

function evaluate(expression) {
  return vm.runInContext(expression, context);
}

test("accepts real Creer codes and rejects unsupported separators", () => {
  assert.equal(evaluate("esCodigoValido_('P@14962')"), true);
  assert.equal(evaluate("esCodigoValido_('XBZ-1024')"), true);
  assert.equal(evaluate("esCodigoValido_('XBZ 1024')"), false);
  assert.equal(evaluate("esCodigoValido_('XBZ_1024')"), false);
});

test("maps Drive file names to the correct product and image slot", () => {
  assert.deepEqual(
    JSON.parse(evaluate("JSON.stringify(parsearNombreArchivo_('P@14962.jpg'))")),
    { tipo: "principal", codigo: "P@14962", orden: 0 },
  );
  assert.deepEqual(
    JSON.parse(evaluate("JSON.stringify(parsearNombreArchivo_('XBZ-1024_2.PNG'))")),
    { tipo: "secundaria", codigo: "XBZ-1024", orden: 2 },
  );
  assert.equal(evaluate("parsearNombreArchivo_('notas.txt').tipo"), "ignorado");
});

test("normalizes Brazilian prices and rejects formula-shaped values", () => {
  assert.equal(evaluate("leerPrecio_('R$ 1.234,56').valor"), 1234.56);
  assert.equal(evaluate("leerPrecio_('=1+1').valido"), false);
  assert.equal(evaluate("leerPrecio_('@SUM(A1:A2)').valido"), false);
  assert.equal(evaluate("leerPrecio_('-10').valido"), false);
});

test("protects text cells from spreadsheet formula injection", () => {
  assert.equal(evaluate("celdaSegura_('=IMPORTXML(\"x\")')"), "'=IMPORTXML(\"x\")");
  assert.equal(evaluate("celdaSegura_('Producto normal')"), "Producto normal");
});

test("public API returns only complete products from active categories", () => {
  vm.runInContext(
    `
    CacheService = { getScriptCache: function () {
      return { get: function () { return null; }, put: function () {}, remove: function () {} };
    }};
    cargarCategorias_ = function () { return { lista: [
      { nombre: 'Bolsas', activa: true, orden: 1 },
      { nombre: 'Oculta', activa: false, orden: 2 }
    ]}; };
    leerProductos_ = function () { return [
      { codigo: 'P@14962', nombre: 'Sacola', categoria: 'Bolsas', subcategoria: '', descripcion: 'Algodão', precio: 10, precioValido: true, moneda: 'BRL', imagenes: ['img-publica'], estado: 'PUBLICADO', destacado: false, observaciones: 'privada', driveFolder: 'privada' },
      { codigo: 'SEM-DESC', nombre: 'Sem descrição', categoria: 'Bolsas', subcategoria: '', descripcion: '', precio: 10, precioValido: true, moneda: 'BRL', imagenes: ['img-2'], estado: 'PUBLICADO', destacado: false },
      { codigo: 'CAT-OFF', nombre: 'Categoria oculta', categoria: 'Oculta', subcategoria: '', descripcion: 'Texto', precio: 10, precioValido: true, moneda: 'BRL', imagenes: ['img-3'], estado: 'PUBLICADO', destacado: false },
      { codigo: 'CAT-X', nombre: 'Categoria inexistente', categoria: 'Inexistente', subcategoria: '', descripcion: 'Texto', precio: 10, precioValido: true, moneda: 'BRL', imagenes: ['img-4'], estado: 'PUBLICADO', destacado: false }
    ]; };
    `,
    context,
  );

  const products = JSON.parse(evaluate("JSON.stringify(getProductosPublicados())"));
  assert.equal(products.length, 1);
  assert.equal(products[0].codigo, "P@14962");
  assert.equal("observaciones" in products[0], false);
  assert.equal("driveFolder" in products[0], false);
});
