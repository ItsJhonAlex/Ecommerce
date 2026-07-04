import { db } from "@avanzar/db";
import { beforeEach, describe, expect, test } from "bun:test";
import { promoteToAdmin, request, resetDb, signUp } from "./helpers";

beforeEach(async () => {
  await resetDb();
  await db.execute(`TRUNCATE TABLE "store_settings"`);
});

async function adminCookie(): Promise<string> {
  const { cookie } = await signUp({
    name: "Boss",
    email: "boss@avanzar.test",
    password: "supersecret123",
  });
  await promoteToAdmin("boss@avanzar.test");
  return cookie;
}

describe("admin/settings/receipt-preview", () => {
  test("sin auth → 401", async () => {
    const res = await request("/api/v1/admin/settings/receipt-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName: "Mi Negocio" }),
    });
    expect(res.status).toBe(401);
  });

  test("con auth y valores → 200 y PDF", async () => {
    const cookie = await adminCookie();
    const res = await request("/api/v1/admin/settings/receipt-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ businessName: "Mi Negocio", phone: "+5350000000" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    const bytes = new Uint8Array(await res.arrayBuffer());
    const head = new TextDecoder().decode(bytes.slice(0, 4));
    expect(head).toBe("%PDF");
  });

  test("body vacío → 200 y PDF (usa defaults)", async () => {
    const cookie = await adminCookie();
    const res = await request("/api/v1/admin/settings/receipt-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    const bytes = new Uint8Array(await res.arrayBuffer());
    const head = new TextDecoder().decode(bytes.slice(0, 4));
    expect(head).toBe("%PDF");
  });
});
