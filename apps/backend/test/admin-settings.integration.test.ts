import { db } from "@avanzar/db";
import { beforeEach, describe, expect, test } from "bun:test";
import { promoteToAdmin, request, resetDb, signUp } from "./helpers";

beforeEach(async () => {
  await resetDb();
  // `resetDb` no trunca store_settings (singleton fuera de la lista de FKs), así que
  // lo limpiamos acá para aislar los tests que escriben la fila 'default'.
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

type SettingsBody = {
  settings: {
    id: string;
    businessName: string;
    phone: string | null;
    address: string | null;
    email: string | null;
    receiptNote: string | null;
  };
};

describe("admin/settings", () => {
  test("sin auth → GET y PATCH devuelven 401", async () => {
    const get = await request("/api/v1/admin/settings");
    expect(get.status).toBe(401);
    const patch = await request("/api/v1/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName: "Hackers" }),
    });
    expect(patch.status).toBe(401);
  });

  test("GET inicial (sin fila) → 200 y defaults (businessName Avanzar)", async () => {
    const cookie = await adminCookie();
    const res = await request("/api/v1/admin/settings", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as SettingsBody;
    expect(body.settings.businessName).toBe("Avanzar");
    expect(body.settings.phone).toBeNull();
  });

  test("PATCH parcial → 200 refleja valores y GET persiste", async () => {
    const cookie = await adminCookie();
    const headers = { "Content-Type": "application/json", Cookie: cookie };
    const patch = await request("/api/v1/admin/settings", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        businessName: "Avanzar SRL",
        phone: "555",
        email: "x@y.com",
      }),
    });
    expect(patch.status).toBe(200);
    const patched = (await patch.json()) as SettingsBody;
    expect(patched.settings.businessName).toBe("Avanzar SRL");
    expect(patched.settings.phone).toBe("555");
    expect(patched.settings.email).toBe("x@y.com");

    // GET de nuevo: persiste lo guardado.
    const get = await request("/api/v1/admin/settings", {
      headers: { Cookie: cookie },
    });
    const got = (await get.json()) as SettingsBody;
    expect(got.settings.businessName).toBe("Avanzar SRL");
    expect(got.settings.phone).toBe("555");
    expect(got.settings.email).toBe("x@y.com");
  });

  test("PATCH parcial no pisa columnas no enviadas", async () => {
    const cookie = await adminCookie();
    const headers = { "Content-Type": "application/json", Cookie: cookie };
    await request("/api/v1/admin/settings", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ businessName: "Avanzar SRL", phone: "555" }),
    });
    // Segundo PATCH solo cambia email; businessName/phone deben permanecer.
    const patch = await request("/api/v1/admin/settings", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ email: "z@w.com" }),
    });
    const body = (await patch.json()) as SettingsBody;
    expect(body.settings.businessName).toBe("Avanzar SRL");
    expect(body.settings.phone).toBe("555");
    expect(body.settings.email).toBe("z@w.com");
  });

  test("PATCH email inválido → 400 (validación fallida)", async () => {
    const cookie = await adminCookie();
    const res = await request("/api/v1/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ email: "no-es-email" }),
    });
    // parseJson devuelve 400 para fallos de schema (convención del codebase; 422 se
    // reserva a reglas de negocio). Ver admin-list-queries.integration.test.ts.
    expect(res.status).toBe(400);
  });

  test("PATCH phone en blanco → 200 y phone null (transform vacío→null)", async () => {
    const cookie = await adminCookie();
    const res = await request("/api/v1/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ phone: "   " }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as SettingsBody;
    expect(body.settings.phone).toBeNull();
  });
});
