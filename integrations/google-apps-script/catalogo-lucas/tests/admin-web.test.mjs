// Pruebas de AdminWeb.gs contra una planilla en memoria (sin Google).
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { crearSimulador, H } from "./planilha-simulada.mjs";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const JPG_FAKE_AS_PNG = Buffer.from("ffd8ffe000104a46494600010100", "hex");

let sim, sheets, drive, T0;
function setup() {
  sim = crearSimulador();
  ({ sheets, drive, T0 } = sim);
}

const post = (body) => sim.doPost(body);
const admin = (accion, body = {}) => post({ accion, apiToken: "write", autor: "lucas@creer.com", ...body });
const datos = () => post({ accion: "admin_datos", apiToken: "read" }).datos;
const row = (sheet, n) => Object.fromEntries(H[sheet].map((h, i) => [h, sheets[sheet].rows[n][i]]));

beforeEach(setup);

test("every write action and the costs read need the admin token, not the read token", () => {
  for (const accion of ["admin_guardar_producto", "admin_subir_imagen", "admin_guardar_categoria", "admin_guardar_cliente", "admin_actualizar_cotizacion", "admin_costos", "admin_guardar_costo"]) {
    const r = post({ accion, apiToken: "read" });
    assert.equal(r.ok, false, accion);
    assert.equal(r.codigo, "NO_AUTORIZADO", accion);
    assert.equal(r.error, "No autorizado.", accion);
  }
  assert.equal(admin("admin_costos").ok, true);
});

test("admin data carries versions and duplicate flags but no costs or Drive folders", () => {
  sheets.CLIENTES.rows.push([3, "Ana 2", "Sol", "ANA@sol.com.br", "", T0, T0]);
  admin("admin_guardar_costo", { codigo: "18839", costo: "4,20", proveedor: "XBZ", notas: "" });
  const d = datos();
  const json = JSON.stringify(d);
  assert.ok(!json.includes("pastaPrivada"), "carpeta de Drive no sale");
  assert.ok(!/costo|4\.2|XBZ/i.test(json), "costos no salen en admin_datos");
  assert.ok(d.categorias.every((c) => c.version && typeof c.productos === "number"));
  assert.equal(d.categorias.find((c) => c.nombre === "Bebidas").productos, 1);
  assert.equal(d.clientes.filter((c) => c.duplicado).length, 2);
  assert.equal(d.clientes.find((c) => c.id === "1").cotizaciones, 1);
  assert.ok(d.cotizaciones[0].version);
  assert.equal(d.productos[0].descripcion, "Descrição");
  assert.equal(d.productos[0].imagenes[0], "https://lh3.googleusercontent.com/d/imgMainCaneca0000001");
});

test("costs are private: saved with the admin token, never in the public catalog", () => {
  const saved = admin("admin_guardar_costo", { codigo: "18839", costo: "1.234,50", proveedor: "XBZ Brindes", notas: "lote 2026" });
  assert.equal(saved.ok, true);
  assert.equal(saved.costo.costo, 1234.5);
  const catalogo = JSON.stringify(post({ accion: "catalogo", apiToken: "read", modo: "presentation" }));
  assert.ok(!/1234|XBZ|lote/.test(catalogo));
  assert.ok(!sim.logs.some((l) => String(l[3]).includes("1234")), "el valor no queda en LOGS");
  const costos = admin("admin_costos").costos;
  assert.equal(costos.length, 1);
  // Editar con versión vieja -> conflicto; sin versión sobre fila existente también.
  assert.equal(admin("admin_guardar_costo", { codigo: "18839", costo: "1", version: "vieja" }).codigo, "CONFLICTO");
  assert.equal(admin("admin_guardar_costo", { codigo: "18839", costo: "1", version: costos[0].version }).ok, true);
  assert.equal(admin("admin_guardar_costo", { codigo: "NAOEXISTE", costo: "1" }).ok, false);
  assert.equal(admin("admin_guardar_costo", { codigo: "18839", costo: "=1+1", version: admin("admin_costos").costos[0].version }).ok, false);
});

test("creates and edits a full product, keeps images the browser never sees as IDs", () => {
  const nuevo = admin("admin_guardar_producto", {
    modo: "crear",
    producto: { codigo: "15384", nombre: "Garrafa", categoria: "bebidas", subcategoria: "rPET", descripcion: "700 ml", precio: "12,90", estado: "PENDIENTE", destacado: true, observaciones: "", imagenes: [{ tipo: "drive", valor: "https://drive.google.com/file/d/imgDriveNova00000002/view" }] },
  });
  assert.equal(nuevo.ok, true, nuevo.error);
  assert.equal(nuevo.producto.categoria, "Bebidas");
  assert.equal(row("PRODUCTOS", 3).IMAGEN_PRINCIPAL, "imgDriveNova00000002");

  const base = { codigo: "18839", nombre: "Caneca Térmica", categoria: "Bebidas", subcategoria: "", descripcion: "Nova", precio: "15", estado: "PUBLICADO", destacado: false, observaciones: "ok" };
  const stale = admin("admin_guardar_producto", { modo: "editar", fechaActualizacion: "2020-01-01T00:00:00.000Z", producto: base });
  assert.equal(stale.codigo, "CONFLICTO");

  const ok = admin("admin_guardar_producto", { modo: "editar", fechaActualizacion: T0.toISOString(), producto: { ...base, imagenes: [{ tipo: "mantener" }, { tipo: "mantener" }, { tipo: "mantener" }] } });
  assert.equal(ok.ok, true, ok.error);
  assert.equal(row("PRODUCTOS", 1).IMAGEN_PRINCIPAL, "imgMainCaneca0000001", "mantener conserva la imagen");
  assert.equal(row("PRODUCTOS", 1).DRIVE_FOLDER, "pastaPrivada123456", "columnas no editables quedan iguales");

  const fecha = row("PRODUCTOS", 1).FECHA_ACTUALIZACION.toISOString();
  const quitar = admin("admin_guardar_producto", { modo: "editar", fechaActualizacion: fecha, producto: { ...base, estado: "PUBLICADO", imagenes: [{ tipo: "quitar" }] } });
  assert.equal(quitar.ok, false, "no se publica sin imagen principal");

  const pdf = admin("admin_guardar_producto", { modo: "editar", fechaActualizacion: fecha, producto: { ...base, imagenes: [{ tipo: "mantener" }, { tipo: "drive", valor: "docPrivado0000000003" }] } });
  assert.equal(pdf.ok, false);
  assert.match(pdf.error, /no es una imagen/);
  assert.equal(admin("admin_guardar_producto", { modo: "editar", fechaActualizacion: fecha, producto: { ...base, imagenes: [{ tipo: "borrar-tudo" }] } }).ok, false);
});

test("image upload checks the real file signature and names it like the importer", () => {
  const fecha = T0.toISOString();
  const falso = admin("admin_subir_imagen", { codigo: "18839", espacio: 1, tipo: "image/png", contenido: JPG_FAKE_AS_PNG.toString("base64"), fechaActualizacion: fecha });
  assert.equal(falso.ok, false);
  assert.equal(drive.created.length, 0, "nada se crea en la carpeta pública");
  assert.equal(admin("admin_subir_imagen", { codigo: "18839", espacio: 1, tipo: "application/pdf", contenido: PNG.toString("base64") }).ok, false);
  assert.equal(admin("admin_subir_imagen", { codigo: "18839", espacio: 5, tipo: "image/png", contenido: PNG.toString("base64") }).ok, false);

  const ok = admin("admin_subir_imagen", { codigo: "18839", espacio: 1, tipo: "image/png", contenido: PNG.toString("base64"), fechaActualizacion: fecha });
  assert.equal(ok.ok, true, ok.error);
  assert.equal(drive.created[0].name, "18839_1.png");
  assert.equal(drive.created[0].folderId, "pastaPublicaPortaRetratos1");
  assert.equal(drive.created[0].access, "ANYONE_WITH_LINK");
  assert.equal(row("PRODUCTOS", 1).IMAGEN_2, "subida00000000000001");
  assert.equal(row("PRODUCTOS", 1).IMAGEN_PRINCIPAL, "imgMainCaneca0000001");

  // Conflicto: el archivo nuevo no queda suelto en la carpeta pública.
  const conflicto = admin("admin_subir_imagen", { codigo: "18839", espacio: 2, tipo: "image/png", contenido: PNG.toString("base64"), fechaActualizacion: fecha });
  assert.equal(conflicto.codigo, "CONFLICTO");
  assert.equal(drive.created[1].trashed, true);
});

test("categories: no duplicates, rename moves products and bumps their date, stale edits are rejected", () => {
  assert.equal(admin("admin_guardar_categoria", { categoria: { nombre: "BEBIDAS", descripcion: "", orden: 3, activa: true } }).ok, false);
  const criada = admin("admin_guardar_categoria", { categoria: { nombre: "Casa", descripcion: "Cozinha", orden: 3, activa: true } });
  assert.equal(criada.ok, true);
  assert.equal(row("CATEGORIAS", 3).SLUG, "casa");

  const bebidas = datos().categorias.find((c) => c.nombre === "Bebidas");
  const renomear = admin("admin_guardar_categoria", { version: bebidas.version, categoria: { id: bebidas.id, nombre: "Copos e garrafas", descripcion: "", orden: 1, activa: true } });
  assert.equal(renomear.ok, true, renomear.error);
  assert.equal(renomear.productosActualizados, 1);
  assert.equal(row("PRODUCTOS", 1).CATEGORIA, "Copos e garrafas");
  assert.ok(row("PRODUCTOS", 1).FECHA_ACTUALIZACION > T0);
  assert.equal(row("CATEGORIAS", 1).SLUG, "bebidas", "el slug se conserva");

  const again = admin("admin_guardar_categoria", { version: bebidas.version, categoria: { id: bebidas.id, nombre: "Outra", descripcion: "", orden: 1, activa: false } });
  assert.equal(again.codigo, "CONFLICTO");
  const escritorio = datos().categorias.find((c) => c.nombre === "Escritório");
  assert.equal(admin("admin_guardar_categoria", { version: escritorio.version, categoria: { id: escritorio.id, nombre: "Casa", descripcion: "", orden: 2, activa: true } }).ok, false, "no puede tomar el nombre de otra");
  assert.equal(admin("admin_guardar_categoria", { categoria: { nombre: "X", orden: -1, activa: true } }).ok, false);
});

test("customers: one e-mail, one customer; stale edits are rejected", () => {
  const dup = admin("admin_guardar_cliente", { cliente: { nombre: "Outra Ana", empresa: "", email: " ANA@Sol.com.br ", telefono: "" } });
  assert.equal(dup.codigo, "DUPLICADO");
  const novo = admin("admin_guardar_cliente", { cliente: { nombre: "Caio", empresa: "Mercado", email: "caio@mercado.com", telefono: "0800 123" } });
  assert.equal(novo.ok, true);
  assert.equal(sheets.CLIENTES.rows.length, 4);

  const ana = datos().clientes.find((c) => c.id === "1");
  assert.equal(admin("admin_guardar_cliente", { version: ana.version, cliente: { id: "1", nombre: "Ana", empresa: "Sol", email: "bia@pap.com", telefono: "" } }).codigo, "DUPLICADO");
  const edit = admin("admin_guardar_cliente", { version: ana.version, cliente: { id: "1", nombre: "Ana Souza", empresa: "Livraria Sol", email: "ana@sol.com.br", telefono: "=HYPERLINK(1)" } });
  assert.equal(edit.ok, true, edit.error);
  assert.equal(row("CLIENTES", 1).TELEFONO, "'=HYPERLINK(1)", "fórmulas neutralizadas");
  assert.equal(admin("admin_guardar_cliente", { version: ana.version, cliente: { id: "1", nombre: "X", empresa: "", email: "ana@sol.com.br" } }).codigo, "CONFLICTO");
  assert.equal(admin("admin_guardar_cliente", { cliente: { nombre: "", empresa: "", email: "sem@nome.com" } }).ok, false);
});

test("quotes: status and internal notes only, with conflict control", () => {
  const q = datos().cotizaciones[0];
  assert.equal(admin("admin_actualizar_cotizacion", { id: q.id, version: q.version, estado: "APAGADA" }).ok, false);
  const ok = admin("admin_actualizar_cotizacion", { id: q.id, version: q.version, estado: "cotizada", notasInternas: "Enviado por WhatsApp" });
  assert.equal(ok.ok, true, ok.error);
  const r = row("COTIZACIONES", 1);
  assert.equal(r.ESTADO, "COTIZADA");
  assert.equal(r.NOTAS_INTERNAS, "Enviado por WhatsApp");
  assert.equal(r.NOTAS, "Entrega rápida", "lo que escribió el cliente no cambia");
  assert.equal(r.CONTACTO_EMAIL, "ana@sol.com.br");
  assert.equal(admin("admin_actualizar_cotizacion", { id: q.id, version: q.version, estado: "APROBADA" }).codigo, "CONFLICTO");
});
