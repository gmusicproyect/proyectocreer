import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });

for (const file of ["Config.gs", "Productos.gs", "DriveImporter.gs", "Cotizaciones.gs", "Api.gs", "AdminWeb.gs"]) {
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

test("private admin endpoint joins products, customers and quote items", () => {
  vm.runInContext(
    `
    function makeSheet_(headers, rows) {
      return {
        getLastColumn: function () { return headers.length; },
        getLastRow: function () { return rows.length + 1; },
        getRange: function (row, column, rowCount, columnCount) {
          return { getValues: function () {
            if (row === 1) return [headers.slice(column - 1, column - 1 + columnCount)];
            return rows.slice(row - 2, row - 2 + rowCount).map(function (values) {
              return values.slice(column - 1, column - 1 + columnCount);
            });
          }};
        }
      };
    }
    // En Google, Utilities siempre existe; aquí basta con un resumen simple.
    Utilities = {
      DigestAlgorithm: { MD5: 'MD5' }, Charset: { UTF_8: 'UTF_8' },
      computeDigest: function (a, texto) { return String(texto).split('').map(function (c) { return c.charCodeAt(0) % 128; }); },
      base64EncodeWebSafe: function (bytes) { return bytes.join('.'); }
    };
    var adminSheets_ = {};
    adminSheets_[SHEETS.CLIENTES] = makeSheet_(HEADERS.CLIENTES, [[
      '1', 'Lucas', 'Empresa', 'lucas@example.com', '01199990000', '2026-09-29', '2026-09-29'
    ]]);
    adminSheets_[SHEETS.COTIZACIONES] = makeSheet_(HEADERS.COTIZACIONES, [[
      '1', 'CR-20260929-001', '1', 'NUEVA', 'Urgente', '2026-09-29', 'key-1234567890123456',
      'Lucas', 'Empresa', 'lucas@example.com', '01199990000'
    ]]);
    adminSheets_[SHEETS.COTIZACION_ITEMS] = makeSheet_(HEADERS.COTIZACION_ITEMS, [[
      '1', '06100', 'Caderno', 50, 'Natural', 'Logo', 12.5, 'BRL'
    ]]);
    hoja_ = function (nombre) { return adminSheets_[nombre]; };
    leerProductos_ = function () { return [{
      codigo: '06100', nombre: 'Caderno', categoria: 'Escritório', subcategoria: '',
      precio: 12.5, precioValido: true, moneda: 'BRL', imagenes: ['img-1'],
      estado: 'PENDIENTE', destacado: false, descripcion: 'Caderno', fechaActualizacion: '2026-09-29'
    }]; };
    cargarCategorias_ = function () { return { lista: [{
      id: '1', nombre: 'Escritório', slug: 'escritorio', descripcion: '', activa: true, orden: 1
    }]}; };
    `,
    context,
  );

  const result = JSON.parse(
    evaluate(`doPost({ postData: { contents: ${JSON.stringify(JSON.stringify({ accion: "admin_datos", apiToken: "tok" }))} } }).getContent()`),
  );
  assert.equal(result.ok, true);
  assert.equal(result.datos.productos[0].codigo, "06100");
  assert.equal(result.datos.clientes[0].telefono, "01199990000");
  assert.equal(result.datos.cotizaciones[0].items[0].cantidad, 50);
  assert.equal(result.datos.cotizaciones[0].contacto.email, "lucas@example.com");
});

test("panel edits need the separate write token and only touch price/state", () => {
  vm.runInContext(
    `
    PropertiesService = { getScriptProperties: function () {
      return { getProperty: function (k) {
        return k === 'QUOTE_API_TOKEN' ? 'tok' : k === 'ADMIN_WRITE_TOKEN' ? 'write' : null;
      } };
    }};
    registrarLog_ = function () {};
    __llamadas = [];
    actualizarCamposProducto_ = function (codigo, cambios, opciones) {
      __llamadas.push({ codigo: codigo, cambios: cambios, opciones: opciones });
      return { codigo: codigo, nombre: 'Caneca', categoria: 'Bebidas', subcategoria: '', precio: 10, precioValido: true,
        moneda: 'BRL', estado: 'PUBLICADO', destacado: false, imagenes: ['img'], descripcion: 'x', fechaActualizacion: '' };
    };
    `,
    context,
  );
  const post = (body) =>
    JSON.parse(evaluate(`doPost({ postData: { contents: ${JSON.stringify(JSON.stringify(body))} } }).getContent()`));
  const edit = { accion: "admin_actualizar_producto", codigo: "18839", cambios: { precio: "10,00", estado: "publicado" }, fechaActualizacion: "v1", autor: "lucas@creer.com" };

  const withReadToken = post({ ...edit, apiToken: "tok" });
  assert.equal(withReadToken.ok, false);
  assert.equal(withReadToken.codigo, "NO_AUTORIZADO");

  assert.equal(post({ ...edit, apiToken: "write", cambios: { nombre: "x" } }).ok, false);

  const saved = post({ ...edit, apiToken: "write" });
  assert.equal(saved.ok, true);
  const call = JSON.parse(evaluate("JSON.stringify(__llamadas[__llamadas.length - 1])"));
  assert.deepEqual(call.cambios, { precio: "10,00", estado: "PUBLICADO" });
  assert.equal(call.opciones.fechaEsperada, "v1");
  assert.equal(call.opciones.autor, "lucas@creer.com");
});
