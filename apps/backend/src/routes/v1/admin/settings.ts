import { db } from "@avanzar/db";
import { storeSettings } from "@avanzar/db/schema";
import { storeSettingsUpdateSchema } from "@avanzar/shared";
import { Hono } from "hono";
import { parseJson } from "../../../lib/validate";
import type { AuthEnv } from "../../../middlewares/auth";
import { getStoreSettings } from "../../../services/store-settings";

export const adminSettingsRouter = new Hono<AuthEnv>();

/** Quita las claves con valor `undefined` para no pisar columnas en el upsert parcial. */
function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

// GET /api/v1/admin/settings
adminSettingsRouter.get("/", async (c) => {
  return c.json({ settings: await getStoreSettings() });
});

// PATCH /api/v1/admin/settings
adminSettingsRouter.patch("/", async (c) => {
  const parsed = await parseJson(c, storeSettingsUpdateSchema);
  if (!parsed.ok) return parsed.response;
  // Solo las claves enviadas: un PATCH parcial cambia únicamente lo recibido.
  const data = omitUndefined(parsed.data);
  const [row] = await db
    .insert(storeSettings)
    .values({ id: "default", ...data })
    .onConflictDoUpdate({
      target: storeSettings.id,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return c.json({ settings: row });
});
