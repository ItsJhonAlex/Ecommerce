import { z } from "zod";

/**
 * Variable opcional donde un string vacío en `.env` (ej. `NOX_SMS_TOKEN_SECRET=`)
 * equivale a "no configurada": se normaliza a `undefined` antes de validar. Así
 * dejar la clave vacía = feature desactivado, sin romper el arranque.
 */
const optionalEnv = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

/**
 * Schema del entorno. Se exporta aparte para poder testearlo sin disparar la
 * validación con side-effects (process.exit) de loadEnv().
 */
export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // better-auth lo lee solo de process.env; lo validamos acá para fallar al
  // arrancar si falta. No lo borres aunque el código de la app no lo use directo.
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3000),
  NOX_SMS_BASE_URL: optionalEnv(z.string().url()),
  NOX_SMS_TOKEN_SECRET: optionalEnv(z.string().min(1)),
  // Horas tras las cuales una orden impaga se auto-cancela. Opcional; el barrido
  // usa 72 por defecto cuando no está configurada.
  ORDER_UNPAID_TTL_HOURS: optionalEnv(z.coerce.number().int().positive()),
  // "true" SOLO si el backend corre detrás de un reverse-proxy que setea
  // x-real-ip/x-forwarded-for de forma confiable (el proxy debe sobrescribirlos).
  // Define de dónde el rate limiter toma la IP del cliente. Default: false (IP del socket).
  TRUST_PROXY: optionalEnv(z.enum(["true", "false"])),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Valida process.env una sola vez (memoizado). Si falta o está mal una variable,
 * imprime los issues y corta el proceso con un mensaje claro. NO se llama en el
 * top-level del módulo para no afectar los unit tests que solo usan envSchema.
 */
export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Variables de entorno inválidas:", parsed.error.issues);
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}
