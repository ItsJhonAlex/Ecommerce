import { beforeEach, describe, expect, test } from "bun:test";
import { promoteToAdmin, request, resetDb, signUp } from "./helpers";

beforeEach(async () => {
  await resetDb();
});

/** Crea un admin (signup + promote) y devuelve su cookie de sesión. */
async function adminCookie(): Promise<string> {
  const { cookie } = await signUp({
    name: "Boss",
    email: "boss@avanzar.test",
    password: "supersecret123",
  });
  await promoteToAdmin("boss@avanzar.test");
  return cookie;
}

describe("validación de query en listados admin", () => {
  test("GET /admin/orders?status=foo → 400", async () => {
    const cookie = await adminCookie();
    const res = await request("/api/v1/admin/orders?status=foo", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(400);
  });

  test("GET /admin/orders?status=paid → 200", async () => {
    const cookie = await adminCookie();
    const res = await request("/api/v1/admin/orders?status=paid", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
  });

  test("GET /admin/payments?status=foo → 400", async () => {
    const cookie = await adminCookie();
    const res = await request("/api/v1/admin/payments?status=foo", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(400);
  });

  test("GET /admin/payments?status=confirmed → 200", async () => {
    const cookie = await adminCookie();
    const res = await request("/api/v1/admin/payments?status=confirmed", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
  });
});
