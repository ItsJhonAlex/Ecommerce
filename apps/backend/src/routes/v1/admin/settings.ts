import { db } from "@avanzar/db";
import { storeSettings } from "@avanzar/db/schema";
import { storeSettingsUpdateSchema } from "@avanzar/shared";
import { Hono } from "hono";
import { parseJson } from "../../../lib/validate";
import type { AuthEnv } from "../../../middlewares/auth";
import type { ReceiptSettings } from "../../../services/receipt/render";
import { renderReceipt } from "../../../services/receipt/render";
import { sampleReceiptOrder } from "../../../services/receipt/sample";
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

// POST /api/v1/admin/settings/receipt-preview
// Genera el PDF del recibo con un pedido de ejemplo + los valores actuales del
// form (aún sin guardar), para la vista previa en vivo del admin.
adminSettingsRouter.post("/receipt-preview", async (c) => {
  // Lectura tolerante: mientras el usuario tipea el body puede llegar incompleto
  // o inválido; nunca debe romper la vista previa (no usamos el schema estricto).
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  // `x || null`: strings vacías o solo espacios se tratan como "sin valor".
  const softString = (v: unknown): string | null => {
    const s = (typeof v === "string" ? v : "").trim();
    return s || null;
  };

  const settings: ReceiptSettings = {
    businessName:
      (typeof body.businessName === "string" ? body.businessName : "").trim() ||
      "Avanzar",
    phone: softString(body.phone),
    address: softString(body.address),
    email: softString(body.email),
    receiptNote: softString(body.receiptNote),
  };

  const pdf = await renderReceipt(sampleReceiptOrder(), settings);
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
    },
  });
});
