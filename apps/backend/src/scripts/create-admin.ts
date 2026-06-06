import { db } from "@avanzar/db";
import { user } from "@avanzar/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../auth";

/**
 * Bootstrap interactivo del primer admin. Pide datos por consola, crea el usuario
 * vía Better Auth y lo promueve a `admin`. Idempotente: si el email ya existe,
 * solo cambia el rol.
 *
 * Uso: bun run seed:admin
 * Nota: el password se ingresa visible (prompt() de Bun no oculta input). Es una
 * herramienta de bootstrap local, no para entornos compartidos.
 */
function ask(question: string): string {
  const answer = prompt(question);
  if (!answer || !answer.trim()) {
    console.error("Cancelado: valor vacío.");
    process.exit(1);
  }
  return answer.trim();
}

const name = ask("Nombre del admin: ");
const email = ask("Email: ");
const password = ask("Password (mínimo 8 caracteres): ");

try {
  await auth.api.signUpEmail({ body: { name, email, password } });
  console.log(`Usuario ${email} creado.`);
} catch (err) {
  // Puede fallar por email duplicado (caso esperado) o por reglas de Better Auth
  // (password < 8, email inválido). Mostramos el detalle para no confundir al operador.
  const detail = err instanceof Error ? err.message : String(err);
  console.warn(`No se pudo crear ${email} (¿ya existe?). Detalle: ${detail}. Se intentará promover.`);
}

const [updated] = await db
  .update(user)
  .set({ role: "admin", updatedAt: new Date() })
  .where(eq(user.email, email))
  .returning();

if (!updated) {
  console.error(`No existe un usuario con email ${email}. Abortado.`);
  process.exit(1);
}

console.log(`✅ ${email} es ahora admin (role=${updated.role}).`);
process.exit(0);
