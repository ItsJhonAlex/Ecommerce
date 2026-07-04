import { storeSettings } from "@avanzar/db/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/** Forma completa de la fila de ajustes (lo que devuelve el backend). */
export const storeSettingsSelectSchema = createSelectSchema(storeSettings);

/**
 * Texto opcional nullable: string vacía o solo espacios → `null` (transform).
 * Si no viene la clave, queda `undefined` (no se toca ese campo en el upsert).
 */
const nullableText = z
  .string()
  .transform((v) => {
    const t = v.trim();
    return t === "" ? null : t;
  })
  .optional();

/**
 * Body de PATCH /admin/settings. Todos los campos opcionales; strings vacías se
 * normalizan a `null` para phone/address/email/receiptNote. `businessName` no
 * puede quedar vacío si se envía. `email` valida formato solo si viene no vacío.
 */
export const storeSettingsUpdateSchema = z.object({
  businessName: z.string().trim().min(1).optional(),
  phone: nullableText,
  address: nullableText,
  receiptNote: nullableText,
  email: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v === "" || z.email().safeParse(v).success, {
      message: "Email inválido",
    })
    .transform((v) => (v === "" ? null : v))
    .optional(),
  notifyPhones: z
    .array(z.string().regex(/^\+53\d{8}$/, "Número cubano inválido"))
    .optional(),
  notifySmsEnabled: z.boolean().optional(),
});

export type StoreSettings = z.infer<typeof storeSettingsSelectSchema>;
export type StoreSettingsUpdate = z.infer<typeof storeSettingsUpdateSchema>;
