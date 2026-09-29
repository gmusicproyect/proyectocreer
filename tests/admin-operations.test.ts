import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkImageFile,
  marginOf,
  parseCategoryForm,
  parseCostForm,
  parseCustomerForm,
  parseProductForm,
  parseQuoteUpdate,
} from "../src/modules/admin/admin-forms.ts";
import { canUseSheets } from "../src/modules/auth/access.ts";
import { costsFromApi } from "../src/modules/admin/sheets-data.ts";

const form = (values: Record<string, string>) => ({ get: (k: string) => values[k] ?? null });

const product = {
  mode: "editar", code: "18839", name: "Caneca", category: "Bebidas", subcategory: "",
  description: "Térmica", price: "45,90", state: "PUBLICADO", updatedAt: "2026-09-28T12:00:00.000Z",
};

test("product form: images travel as actions, never as raw Drive IDs chosen by the browser", () => {
  const ok = parseProductForm(form({ ...product, image0: "mantener", image1: "drive", image1Link: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQ/view", image2: "quitar" }));
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.deepEqual(ok.value.images, [
      { tipo: "mantener" },
      { tipo: "drive", valor: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQ/view" },
      { tipo: "quitar" },
    ]);
    assert.equal(ok.value.featured, false);
  }
  assert.equal(parseProductForm(form({ ...product, image1: "drive", image1Link: "javascript:alert(1)" })).ok, false);
  assert.equal(parseProductForm(form({ ...product, image0: "apagar-drive" })).ok, false);
});

test("product form: publishing needs category, price and description; bad input is rejected", () => {
  assert.equal(parseProductForm(form({ ...product, price: "" })).ok, false);
  assert.equal(parseProductForm(form({ ...product, price: "", state: "PENDIENTE" })).ok, true);
  assert.equal(parseProductForm(form({ ...product, state: "OCULTO", description: "" })).ok, true);
  assert.equal(parseProductForm(form({ ...product, price: "=1+1" })).ok, false);
  assert.equal(parseProductForm(form({ ...product, code: "XBZ 1" })).ok, false);
  assert.equal(parseProductForm(form({ ...product, name: "" })).ok, false);
  assert.equal(parseProductForm(form({ ...product, state: "APAGADO" })).ok, false);
  assert.equal(parseProductForm(form({ ...product, description: "x".repeat(5001) })).ok, false);
  const created = parseProductForm(form({ ...product, mode: "crear", code: "p@14962", featured: "on" }));
  assert.equal(created.ok && created.value.code, "P@14962");
  assert.equal(created.ok && created.value.featured, true);
});

test("category, customer, quote and cost forms validate before reaching Google", () => {
  assert.equal(parseCategoryForm(form({ name: "Casa", order: "3", active: "on" })).ok, true);
  assert.equal(parseCategoryForm(form({ name: "", order: "3" })).ok, false);
  assert.equal(parseCategoryForm(form({ name: "Casa", order: "-1" })).ok, false);
  assert.equal(parseCategoryForm(form({ name: "Casa", order: "1", version: "<script>" })).ok, false);

  const customer = parseCustomerForm(form({ name: "Ana", email: " ANA@Sol.com.br " }));
  assert.equal(customer.ok && customer.value.email, "ana@sol.com.br");
  assert.equal(parseCustomerForm(form({ name: "Ana", email: "ana" })).ok, false);
  assert.equal(parseCustomerForm(form({ email: "ana@sol.com" })).ok, false, "precisa de nome ou empresa");

  assert.equal(parseQuoteUpdate(form({ id: "1", status: "cotizada", version: "abc_-" })).ok, true);
  assert.equal(parseQuoteUpdate(form({ id: "1", status: "PAGA" })).ok, false);
  assert.equal(parseQuoteUpdate(form({ id: "x", status: "NUEVA" })).ok, false);

  assert.equal(parseCostForm(form({ code: "18839", cost: "12,40" })).ok, true);
  assert.equal(parseCostForm(form({ code: "18839", cost: "" })).ok, true, "vazio remove o custo");
  assert.equal(parseCostForm(form({ code: "18839", cost: "-3" })).ok, false);
});

test("image upload checks the real file signature, type and size", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
  assert.equal(checkImageFile("image/png", png), null);
  assert.equal(checkImageFile("image/jpeg", jpg), null);
  assert.notEqual(checkImageFile("image/png", jpg), null, "extensão trocada");
  assert.notEqual(checkImageFile("application/pdf", png), null);
  assert.notEqual(checkImageFile("image/png", new Uint8Array(0)), null);
  const big = new Uint8Array(3 * 1024 * 1024 + 1);
  big.set(png);
  assert.notEqual(checkImageFile("image/png", big), null);
});

test("margin is computed on the sale price", () => {
  assert.equal(marginOf(100, 60), 0.4);
  assert.equal(marginOf(null, 60), null);
  assert.equal(marginOf(0, 0), null);
});

const member = (role: string, tenantSlug = "creer") => ({
  mode: "supabase" as const,
  role: role as "sales",
  tenantId: "t1",
  tenantName: "Creer",
  tenantSlug,
  userId: "u1",
  userEmail: "x@creer.com",
});

test("each role only reaches its own operations; costs are admin-only", () => {
  const matrix: [string, string, boolean][] = [
    ["tenant_admin", "costs:read", true],
    ["tenant_admin", "costs:write", true],
    ["tenant_admin", "customers:write", true],
    ["catalog_editor", "catalog:write", true],
    ["catalog_editor", "costs:read", false],
    ["catalog_editor", "customers:write", false],
    ["catalog_editor", "quotations:write", false],
    ["sales", "quotations:write", true],
    ["sales", "customers:write", true],
    ["sales", "catalog:write", false],
    ["sales", "costs:read", false],
    ["provider_owner", "catalog:write", false],
    ["provider_owner", "costs:read", false],
    ["provider_owner", "customers:write", false],
  ];
  for (const [role, permission, expected] of matrix) {
    assert.equal(canUseSheets(member(role), permission as "costs:read"), expected, `${role} ${permission}`);
  }
  assert.equal(canUseSheets(member("tenant_admin", "outro"), "costs:read"), false, "outro tenant");
  assert.equal(canUseSheets(null, "catalog:write"), false);
});

test("costs payload is parsed defensively", () => {
  const costs = costsFromApi({ ok: true, costos: [
    { codigo: "18839", costo: 4.2, proveedor: "XBZ", notas: "", version: "v1" },
    { codigo: "18839", costo: 99 },
    { codigo: "", costo: 1 },
    { codigo: "06100", costo: -1 },
  ] });
  assert.equal(costs.size, 2);
  assert.equal(costs.get("18839")?.cost, 4.2);
  assert.equal(costs.get("06100")?.cost, null);
  assert.throws(() => costsFromApi({ ok: false }));
});

test("known spreadsheet messages are shown in Portuguese", async () => {
  const { translateScriptMessage } = await import("../src/modules/admin/admin-forms.ts");
  assert.equal(translateScriptMessage('La categoría "Bebidas" ya existe.'), 'A categoria "Bebidas" já existe.');
  assert.equal(
    translateScriptMessage("Para PUBLICAR falta: precio, imagen principal. Guárdalo como BORRADOR mientras tanto."),
    "Para publicar falta: preço, imagem principal. Salve como Pendente enquanto isso.",
  );
  assert.equal(
    translateScriptMessage("Imagen 2: el archivo no es una imagen.\nLa imagen 1 ya pertenece al producto 06100."),
    "Imagem 2: o arquivo do Drive não é uma imagem. A imagem 1 já pertence ao produto 06100.",
  );
  assert.equal(translateScriptMessage("Mensagem desconhecida"), "Mensagem desconhecida");
});
