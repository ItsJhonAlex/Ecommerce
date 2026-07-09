import { Hono } from "hono";
import { getStoreSettings } from "../../../services/store-settings";

/**
 * Ajustes públicos del negocio para header/footer del storefront. Mapeo EXPLÍCITO
 * a un subset seguro: nunca expone los campos de notificación (`notifyPhones`,
 * `notifySmsEnabled`) ni internos (`id`, `updatedAt`).
 */
export const storeSettingsRouter = new Hono();

// GET /api/v1/store-settings
storeSettingsRouter.get("/", async (c) => {
  const s = await getStoreSettings();
  return c.json({
    settings: {
      businessName: s.businessName,
      phone: s.phone,
      address: s.address,
      email: s.email,
      receiptNote: s.receiptNote,
    },
  });
});
