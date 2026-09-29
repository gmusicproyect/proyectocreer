// Planilla simulada en memoria que ejecuta los archivos .gs reales.
// La usan las pruebas (tests/admin-web.test.mjs) y el servidor local de desarrollo (dev/servidor-simulado.mjs).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
export const FILES = ["Config.gs", "Productos.gs", "DriveImporter.gs", "Cotizaciones.gs", "Api.gs", "AdminWeb.gs"];

function chain() {
  const p = new Proxy(function () {}, { get: (_, k) => (k === "then" ? undefined : () => p), apply: () => p });
  return p;
}

class Sheet {
  constructor(name, rows) { this.name = name; this.rows = rows.map((r) => r.slice()); }
  getName() { return this.name; }
  getLastRow() {
    for (let r = this.rows.length; r > 0; r--) if (this.rows[r - 1].some((v) => v !== "" && v !== null && v !== undefined)) return r;
    return 0;
  }
  getLastColumn() { return Math.max(0, ...this.rows.map((r) => r.length)); }
  getMaxRows() { return Math.max(this.rows.length, 1000); }
  getMaxColumns() { return Math.max(this.getLastColumn(), 26); }
  insertRowsAfter() {}
  insertColumnsAfter() {}
  cell(r, c) { return (this.rows[r - 1] || [])[c - 1] ?? ""; }
  put(r, c, v) {
    while (this.rows.length < r) this.rows.push([]);
    const row = this.rows[r - 1];
    while (row.length < c) row.push("");
    row[c - 1] = v;
  }
  getRange(r, c, nr = 1, nc = 1) {
    const cell = (row, col) => this.cell(row, col);
    const put = (row, col, v) => this.put(row, col, v);
    const name = this.name;
    const api = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => cell(r + i, c + j))),
      setValues: (vals) => {
        assert.equal(vals.length, nr, `${name}: filas`);
        vals.forEach((row, i) => { assert.equal(row.length, nc, `${name}: columnas`); row.forEach((v, j) => put(r + i, c + j, v)); });
        return proxy;
      },
      setValue: (v) => { put(r, c, v); return proxy; },
    };
    const proxy = new Proxy(api, { get: (t, k) => (k in t ? t[k] : () => proxy) });
    return proxy;
  }
}

export const H = {
  PRODUCTOS: ["ID", "CODIGO", "NOMBRE", "CATEGORIA", "SUBCATEGORIA", "DESCRIPCION", "PRECIO", "MONEDA", "IMAGEN_PRINCIPAL", "IMAGEN_2", "IMAGEN_3", "DRIVE_FOLDER", "ESTADO", "DESTACADO", "FECHA_CREACION", "FECHA_ACTUALIZACION", "OBSERVACIONES"],
  CATEGORIAS: ["ID", "NOMBRE", "SLUG", "DESCRIPCION", "ACTIVA", "ORDEN"],
  CLIENTES: ["ID", "NOMBRE", "EMPRESA", "EMAIL", "TELEFONO", "FECHA_CREACION", "FECHA_ACTUALIZACION"],
  COTIZACIONES: ["ID", "REFERENCIA", "CLIENTE_ID", "ESTADO", "NOTAS", "FECHA_CREACION", "CLAVE_SOLICITUD", "CONTACTO_NOMBRE", "CONTACTO_EMPRESA", "CONTACTO_EMAIL", "CONTACTO_TELEFONO", "NOTAS_INTERNAS", "FECHA_ACTUALIZACION"],
  COTIZACION_ITEMS: ["COTIZACION_ID", "CODIGO", "NOMBRE", "CANTIDAD", "ACABAMENTO", "PERSONALIZACION", "PRECIO_REFERENCIA", "MONEDA"],
  COSTOS: ["CODIGO", "COSTO", "MONEDA", "PROVEEDOR", "NOTAS", "FECHA_ACTUALIZACION"],
};

 // se crea dentro del contexto de Apps Script (instanceof Date debe funcionar allí)

/** Crea una planilla nueva con datos de ejemplo (2 productos, 2 categorías, 2 clientes, 1 cotización). */
export function crearSimulador() {
  let ctx, sheets, drive, logs, T0;
  logs = [];
  ctx = vm.createContext({});
  T0 = vm.runInContext('new Date("2026-09-28T12:00:00.000Z")', ctx);
  drive = { files: new Map([["imgMainCaneca0000001", { mime: "image/jpeg" }], ["imgDriveNova00000002", { mime: "image/png" }], ["docPrivado0000000003", { mime: "application/pdf" }]]), created: [] };
  const producto = (id, codigo, nombre, cat, estado, img) =>
    [id, codigo, nombre, cat, "", "Descrição", 10, "BRL", img, "", "", "pastaPrivada123456", estado, false, T0, T0, "nota interna"];
  sheets = {
    PRODUCTOS: new Sheet("PRODUCTOS", [H.PRODUCTOS, producto(1, "18839", "Caneca", "Bebidas", "PUBLICADO", "imgMainCaneca0000001"), producto(2, "06100", "Caderno", "Escritório", "PENDIENTE", "")]),
    CATEGORIAS: new Sheet("CATEGORIAS", [H.CATEGORIAS, [1, "Bebidas", "bebidas", "", true, 1], [2, "Escritório", "escritorio", "", true, 2]]),
    CLIENTES: new Sheet("CLIENTES", [H.CLIENTES, [1, "Ana", "Livraria Sol", "ana@sol.com.br", "61 9999", T0, T0], [2, "Bia", "Papelaria", "bia@pap.com", "", T0, T0]]),
    COTIZACIONES: new Sheet("COTIZACIONES", [H.COTIZACIONES, [1, "CR-20260928-001", 1, "NUEVA", "Entrega rápida", T0, "k".repeat(20), "Ana", "Livraria Sol", "ana@sol.com.br", "61 9999", "", ""]]),
    COTIZACION_ITEMS: new Sheet("COTIZACION_ITEMS", [H.COTIZACION_ITEMS, [1, "18839", "Caneca", 50, "Azul", "Logo", 10, "BRL"]]),
    COSTOS: new Sheet("COSTOS", [H.COSTOS]),
    CONFIGURACION: new Sheet("CONFIGURACION", [["CLAVE", "VALOR"], ["MONEDA", "BRL"], ["DRIVE_PRINCIPAL_ID", "pastaPublicaPortaRetratos1"]]),
    LOGS: { getName: () => "LOGS", getLastRow: () => logs.length + 1, getMaxRows: () => 1e6, insertRowsAfter() {}, getRange: () => ({ setValues: (v) => logs.push(...v) }) },
  };
  const ss = { getSheetByName: (n) => sheets[n] || null, getId: () => "ss" };
  const makeFile = (id, info) => ({
    getId: () => id,
    getMimeType: () => info.mime,
    isTrashed: () => Boolean(info.trashed),
    setTrashed: (v) => { info.trashed = v; },
    getSharingAccess: () => info.access || "PRIVATE",
    setSharing: (access) => { info.access = access; },
  });

  Object.assign(ctx, {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, newDataValidation: chain, flush() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {}, removeAll() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ({ QUOTE_API_TOKEN: "read", ADMIN_WRITE_TOKEN: "write" })[k] ?? null }) },
    Session: { getScriptTimeZone: () => "America/Sao_Paulo", getActiveUser: () => ({ getEmail: () => "" }), getEffectiveUser: () => ({ getEmail: () => "jp@gmusic" }) },
    Utilities: {
      DigestAlgorithm: { MD5: "md5" },
      Charset: { UTF_8: "utf8" },
      computeDigest: (alg, text) => Array.from(createHash(alg).update(text, "utf8").digest()).map((b) => (b > 127 ? b - 256 : b)),
      base64EncodeWebSafe: (bytes) => Buffer.from(bytes.map((b) => b & 0xff)).toString("base64url"),
      base64Decode: (s) => { if (!/^[A-Za-z0-9+/=]*$/.test(s)) throw new Error("bad"); return Array.from(Buffer.from(s, "base64")).map((b) => (b > 127 ? b - 256 : b)); },
      newBlob: (bytes, mime, name) => ({ bytes, mime, name }),
      formatDate: () => "20260928",
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: "ANYONE_WITH_LINK" },
      Permission: { VIEW: "VIEW" },
      getFileById: (id) => { const f = drive.files.get(id); if (!f) throw new Error("no"); return makeFile(id, f); },
      getFolderById: (folderId) => ({
        createFile: (blob) => {
          const id = "subida" + String(drive.created.length + 1).padStart(14, "0");
          const info = { mime: blob.mime, name: blob.name, folderId };
          drive.files.set(id, info);
          drive.created.push(info);
          return makeFile(id, info);
        },
      }),
    },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (s) => ({ setMimeType() { return this; }, getContent: () => s }) },
  });
  for (const f of FILES) vm.runInContext(readFileSync(new URL(f, root), "utf8"), ctx, { filename: f });
  const doPost = (bodyObj) =>
    JSON.parse(vm.runInContext(`doPost({ postData: { contents: ${JSON.stringify(JSON.stringify(bodyObj))} } }).getContent()`, ctx));
  return { ctx, sheets, drive, get logs() { return logs; }, T0, doPost };
}
