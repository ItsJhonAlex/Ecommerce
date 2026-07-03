import { db } from "@avanzar/db";

/** Defaults del negocio cuando aún no se configuró la fila singleton. */
const DEFAULTS = {
  businessName: "Avanzar",
  phone: null,
  address: null,
  email: null,
  receiptNote: null,
} as const;

/**
 * Devuelve la fila singleton de ajustes del negocio, o los defaults si aún no se
 * configuró. La forma siempre expone `businessName/phone/address/email/receiptNote`
 * (lo consume el recibo en Fase 2).
 */
export async function getStoreSettings() {
  const row = await db.query.storeSettings.findFirst();
  return row ?? { id: "default", ...DEFAULTS, updatedAt: null };
}
