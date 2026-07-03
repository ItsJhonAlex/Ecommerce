import { db } from "@avanzar/db";
import { Hono } from "hono";
import { fail } from "../../../lib/responses";
import { renderReceipt } from "../../../services/receipt/render";
import { getStoreSettings } from "../../../services/store-settings";

/** UUID: valida el formato antes de tocar la DB (la columna es uuid y un string
 * arbitrario haría fallar el query). Ante formato inválido, 404 igual que si no
 * matcheara, sin revelar si existe o no. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Acceso público al recibo por token opaco (sin auth). */
export const receiptRouter = new Hono();

// GET /api/v1/receipt/:token — recibo del pedido en PDF por token.
receiptRouter.get("/:token", async (c) => {
  const token = c.req.param("token");
  if (!UUID_RE.test(token)) return fail(c, 404, "Recibo no encontrado");

  const order = await db.query.orders.findFirst({
    where: (o, { eq: e }) => e(o.receiptToken, token),
    with: { items: true, payments: true },
  });
  // 404 uniforme: no revelamos si el token existe o no.
  if (!order) return fail(c, 404, "Recibo no encontrado");

  const settings = await getStoreSettings();
  const pdf = await renderReceipt(order, settings);

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${order.orderNumber}.pdf"`,
    },
  });
});
