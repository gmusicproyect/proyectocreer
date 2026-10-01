import assert from "node:assert/strict";
import { test } from "node:test";
import { authDestination, passwordValidation } from "../src/modules/auth/password-policy.ts";
import { updatePassword } from "../src/modules/auth/password-update.ts";

test("recovery and invitation always lead to password setup, even with hostile next values", () => {
  for (const type of ["recovery", "invite"]) {
    for (const next of [null, "/admin", "//evil.example", "/\\evil.example", "https://evil.example", "/api/admin"]) {
      assert.equal(authDestination(type, next), "/acesso/nova-senha");
    }
  }
  assert.equal(authDestination("signup", "//evil.example"), "/admin");
  assert.equal(authDestination("signup", "/\\evil.example"), "/admin");
  assert.equal(authDestination("signup", "/acesso/nova-senha"), "/acesso/nova-senha");
});

test("password mutation requires verified identity and successful provider response", async () => {
  for (const scenario of ["anonymous", "invalid-session", "provider-failure", "success"]) {
    const calls: string[] = [];
    const auth = {
      async getUser() {
        calls.push("verify");
        return { data: { user: scenario === "anonymous" ? null : { id: "test" } }, error: scenario === "invalid-session" ? new Error("invalid") : null };
      },
      async updateUser() { calls.push("update"); return { error: scenario === "provider-failure" ? new Error("private provider detail") : null }; },
      async signOut() { calls.push("sign-out"); return { error: null }; },
    };
    assert.ok((await updatePassword(auth, "short", "short")).error);
    assert.deepEqual(calls, []);
    const result = await updatePassword(auth, "valid-test-value", "valid-test-value");
    if (scenario === "success") {
      assert.equal(result.saved, true);
      assert.deepEqual(calls, ["verify", "update", "sign-out"]);
    } else {
      assert.ok(result.error);
      assert.equal(result.saved, undefined);
      assert.equal(result.error.includes("private provider detail"), false);
      assert.deepEqual(calls, scenario === "provider-failure" ? ["verify", "update"] : ["verify"]);
    }
  }
});

test("password setup rejects short, oversized and mismatched passwords without trimming them", () => {
  assert.ok(passwordValidation("short", "short"));
  assert.ok(passwordValidation("a".repeat(129), "a".repeat(129)));
  assert.ok(passwordValidation("valid-test-value", "different-value"));
  assert.ok(passwordValidation(" test-value ", "test-value"));
  assert.equal(passwordValidation("valid-test-value", "valid-test-value"), null);
});
