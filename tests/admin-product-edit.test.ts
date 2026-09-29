import assert from "node:assert/strict";
import { test } from "node:test";

import { parseProductEdit, priceToInput } from "../src/modules/admin/product-edit.ts";
import { canEditSheetsCatalog, canReadSheetsData } from "../src/modules/auth/access.ts";

const form = (values: Record<string, string>) => ({ get: (k: string) => values[k] ?? null });
const base = { code: "18839", price: "1.234,50", state: "PUBLICADO", updatedAt: "2026-09-28T12:00:00.000Z" };

test("accepts Brazilian prices, empty price and real Creer codes", () => {
  assert.equal(parseProductEdit(form(base)).ok, true);
  assert.equal(parseProductEdit(form({ ...base, price: "" })).ok, true);
  assert.equal(parseProductEdit(form({ ...base, price: "R$ 45,90" })).ok, true);
  assert.equal(parseProductEdit(form({ ...base, code: "p@14962" })).ok, true);
});

test("rejects formulas, negative prices, unknown states and bad codes", () => {
  assert.equal(parseProductEdit(form({ ...base, price: "=1+1" })).ok, false);
  assert.equal(parseProductEdit(form({ ...base, price: "-10" })).ok, false);
  assert.equal(parseProductEdit(form({ ...base, state: "BORRAR" })).ok, false);
  assert.equal(parseProductEdit(form({ ...base, code: "XBZ 1" })).ok, false);
});

test("formats prices for the edit field", () => {
  assert.equal(priceToInput(1234.5), "1.234,50");
  assert.equal(priceToInput(null), "");
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

test("only catalog editors of the sheet's tenant can edit", () => {
  assert.equal(canEditSheetsCatalog(member("tenant_admin")), true);
  assert.equal(canEditSheetsCatalog(member("catalog_editor")), true);
  assert.equal(canEditSheetsCatalog(member("sales")), false);
  assert.equal(canEditSheetsCatalog(member("provider_owner")), false);
  assert.equal(canEditSheetsCatalog(member("tenant_admin", "outro-cliente")), false);
  assert.equal(canEditSheetsCatalog(null), false);
});

test("members of another tenant cannot read the sheet's customers", () => {
  assert.equal(canReadSheetsData(member("sales")), true);
  assert.equal(canReadSheetsData(member("tenant_admin", "outro-cliente")), false);
});

test("local preview can never edit in production", () => {
  const previous = { env: process.env.NODE_ENV, flag: process.env.CREER_ADMIN_PREVIEW };
  Object.assign(process.env, { NODE_ENV: "production", CREER_ADMIN_PREVIEW: "true" });
  const preview = { mode: "preview" as const, role: "preview" as const, tenantId: "demo" as const };
  assert.equal(canEditSheetsCatalog(preview), false);
  Object.assign(process.env, { NODE_ENV: previous.env, CREER_ADMIN_PREVIEW: previous.flag });
});
