import type { Context } from "hono";
import type { ZodType } from "zod";

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

/** Parsea y valida el body JSON contra un schema Zod. 400 si falla. */
export async function parseJson<T>(
  c: Context,
  schema: ZodType<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return { ok: false, response: c.json({ error: "JSON inválido" }, 400) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: c.json(
        { error: "Validación fallida", issues: result.error.issues },
        400,
      ),
    };
  }
  return { ok: true, data: result.data };
}

/** Valida los query params (todos strings) contra un schema Zod. 400 si falla. */
export function parseQuery<T>(c: Context, schema: ZodType<T>): ParseResult<T> {
  const result = schema.safeParse(c.req.query());
  if (!result.success) {
    return {
      ok: false,
      response: c.json(
        { error: "Query inválida", issues: result.error.issues },
        400,
      ),
    };
  }
  return { ok: true, data: result.data };
}
