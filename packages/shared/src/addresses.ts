import { addresses } from "@avanzar/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

export const addressSelectSchema = createSelectSchema(addresses);

/** Lo que el cliente envía al guardar una dirección (el userId lo pone el server). */
export const addressInsertSchema = createInsertSchema(addresses).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type Address = z.infer<typeof addressSelectSchema>;
export type AddressInput = z.infer<typeof addressInsertSchema>;
