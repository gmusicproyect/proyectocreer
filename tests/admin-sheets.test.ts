import assert from "node:assert/strict";
import { test } from "node:test";

import { adminSnapshotFromApi } from "../src/modules/admin/sheets-data.ts";

test("maps the private Sheets response and preserves codes and phone numbers as text", () => {
  const snapshot = adminSnapshotFromApi({
    ok: true,
    datos: {
      generado: "2026-09-29T01:00:00.000Z",
      productos: [{ codigo: "06100", nombre: "Caderno", precio: 12.5, estado: "PENDIENTE" }],
      categorias: [{ id: "1", nombre: "Escritório", activa: true, orden: 1 }],
      clientes: [{ id: "1", nombre: "Lucas", email: "lucas@example.com", telefono: "01199990000" }],
      cotizaciones: [{
        id: "1",
        referencia: "CR-20260929-001",
        estado: "NUEVA",
        contacto: { empresa: "Empresa", email: "contato@example.com" },
        items: [{ codigo: "06100", nombre: "Caderno", cantidad: 50 }],
      }],
      stats: { total: 1, pendientes: 1, categorias: 1 },
    },
  });

  assert.equal(snapshot.products[0].code, "06100");
  assert.equal(snapshot.customers[0].phone, "01199990000");
  assert.equal(snapshot.quotes[0].items[0].quantity, 50);
  assert.equal(snapshot.stats.pending, 1);
});

test("rejects responses that are not explicitly authorized as successful", () => {
  assert.throws(() => adminSnapshotFromApi({ ok: false, datos: {} }));
  assert.throws(() => adminSnapshotFromApi(null));
});
