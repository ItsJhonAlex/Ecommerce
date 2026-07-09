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

type PublicSettingsBody = {
  settings: {
    businessName: string;
    phone: string | null;
    address: string | null;
    email: string | null;
    receiptNote: string | null;
  };
};

describe("public/store-settings", () => {
  test("sin fila → 200 con defaults (businessName Avanzar), público sin cookie", async () => {
    const res = await request("/api/v1/store-settings");
    expect(res.status).toBe(200);
    const body = (await res.json()) as PublicSettingsBody;
    expect(body.settings.businessName).toBe("Avanzar");
  });

  test("expone subset seguro y NUNCA campos de notificación", async () => {
    const cookie = await adminCookie();
    const patch = await request("/api/v1/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        businessName: "Avanzar SRL",
        phone: "+53555",
        notifyPhones: ["+5351234567"],
        notifySmsEnabled: true,
      }),
    });
    expect(patch.status).toBe(200);

    const res = await request("/api/v1/store-settings");
    expect(res.status).toBe(200);
    const body = (await res.json()) as PublicSettingsBody;

    // Contiene el subset seguro.
    expect(body.settings.businessName).toBe("Avanzar SRL");
    expect(body.settings.phone).toBe("+53555");
    expect(Object.hasOwn(body.settings, "address")).toBe(true);
    expect(Object.hasOwn(body.settings, "email")).toBe(true);
    expect(Object.hasOwn(body.settings, "receiptNote")).toBe(true);

    // NO expone campos de notificación (ni id/updatedAt).
    expect(Object.hasOwn(body.settings, "notifyPhones")).toBe(false);
    expect(Object.hasOwn(body.settings, "notifySmsEnabled")).toBe(false);
    const raw = JSON.stringify(body);
    expect(raw.includes("notifyPhones")).toBe(false);
    expect(raw.includes("notifySmsEnabled")).toBe(false);
    expect(raw.includes("+5351234567")).toBe(false);
  });
});
