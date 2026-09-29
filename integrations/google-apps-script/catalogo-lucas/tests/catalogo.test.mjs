import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });

for (const file of ["Config.gs", "Productos.gs", "DriveImporter.gs", "Cotizaciones.gs", "Api.gs"]) {
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

test("validates quote requests without exposing or accepting malformed data", () => {
  const request = JSON.stringify({
    requestKey: "12345678-1234-1234-1234-123456789abc",
    customer: {
      name: "João",
      company: "Empresa",
      email: "joao@example.com",
      phone: "+55 11 99999-0000",
    },
    notes: "=IMPORTXML(\"x\")",
    items: [
      {
        code: "00001",
        name: "Caneta",
        quantity: 100,
        color: "Natural",
        personalization: "Logo em uma cor",
      },
    ],
  });
  const result = JSON.parse(
    evaluate(`JSON.stringify(normalizarSolicitudWeb_(${request}))`),
  );
  assert.equal(result.customer.email, "joao@example.com");
  assert.equal(result.requestKey, "12345678-1234-1234-1234-123456789abc");
  assert.equal(result.items[0].codigo, "00001");
  assert.equal(result.items[0].cantidad, 100);
  assert.throws(
    () =>
      evaluate(
        "normalizarSolicitudWeb_({requestKey:'invalid',customer:{},items:[]})",
      ),
    /clave de solicitud válida/,
  );
});

test("private web catalog endpoint requires the token and hides private fields", () => {
  vm.runInContext(
    `
    PropertiesService = { getScriptProperties: function () {
      return { getProperty: function (k) { return k === 'QUOTE_API_TOKEN' ? 'tok' : null; } };
    }};
    ContentService = { MimeType: { JSON: 'json' }, createTextOutput: function (s) {
      return { setMimeType: function () { return this; }, getContent: function () { return s; } };
    }};
    registrarLog_ = function () {};
    leerProductos_ = function () { return [
      { codigo: '00001', nombre: 'Caneta', categoria: 'Bolsas', subcategoria: '', descripcion: 'Leve', precio: null, precioValido: true, moneda: 'BRL', imagenes: ['img-1'], estado: 'PENDIENTE', destacado: false, observaciones: 'privada', driveFolder: 'privada' },
      { codigo: '00002', nombre: 'Sem foto', categoria: 'Bolsas', subcategoria: '', descripcion: 'x', precio: null, precioValido: true, moneda: 'BRL', imagenes: [''], estado: 'PENDIENTE', destacado: false },
      { codigo: '00003', nombre: 'Oculto', categoria: 'Bolsas', subcategoria: '', descripcion: 'x', precio: 1, precioValido: true, moneda: 'BRL', imagenes: ['img-3'], estado: 'OCULTO', destacado: false }
    ]; };
    `,
    context,
  );
  const post = (body) =>
    JSON.parse(evaluate(`doPost({ postData: { contents: ${JSON.stringify(JSON.stringify(body))} } }).getContent()`));

  assert.equal(post({ accion: "catalogo", modo: "presentation" }).ok, false);
  assert.equal(post({ accion: "catalogo", modo: "presentation", apiToken: "mal" }).ok, false);

  const result = post({ accion: "catalogo", modo: "presentation", apiToken: "tok" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.productos.map((p) => p.codigo), ["00001"]);
  assert.equal(result.productos[0].estado, "PENDIENTE");
  assert.equal("observaciones" in result.productos[0], false);
  assert.equal("driveFolder" in result.productos[0], false);
});
