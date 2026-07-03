import { renderToBuffer } from "@react-pdf/renderer";
import { Receipt, type ReceiptOrder, type ReceiptSettings } from "./Receipt";

export type { ReceiptOrder, ReceiptSettings } from "./Receipt";

/**
 * Renderiza el recibo del pedido a un PDF en memoria.
 * Devuelve los bytes crudos (empiezan con `%PDF`), listos para responder con
 * `Content-Type: application/pdf`.
 */
export async function renderReceipt(
  order: ReceiptOrder,
  settings: ReceiptSettings,
): Promise<Uint8Array> {
  return await renderToBuffer(<Receipt order={order} settings={settings} />);
}
