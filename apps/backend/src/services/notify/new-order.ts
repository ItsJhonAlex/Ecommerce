import { loadEnv } from "../../env";
import { buildNewOrderMessage, type NewOrderInfo } from "./message";
import { sendSms as realSendSms, type SendSmsResult } from "./sms";

/** Base URL por defecto de la API de SMS si no se configuró en el entorno. */
const DEFAULT_SMS_BASE_URL = "https://otp.noxcreation.dev/api/v2";

/**
 * Dependencias inyectables de `notifyNewOrder`. Se exponen para poder testear sin
 * tocar el cache memoizado de `loadEnv` ni la conexión real a la DB de `getStoreSettings`.
 * En producción se usan los defaults reales.
 */
export interface NotifyNewOrderDeps {
  loadEnv: () => { NOX_SMS_BASE_URL?: string; NOX_SMS_TOKEN_SECRET?: string };
  getStoreSettings: () => Promise<{
    businessName: string;
    notifyPhones: readonly string[];
    notifySmsEnabled: boolean;
  }>;
  sendSms: (
    baseUrl: string,
    tokenSecret: string,
    phoneNumber: string,
    message: string,
  ) => Promise<SendSmsResult>;
}

const defaultDeps: NotifyNewOrderDeps = {
  loadEnv,
  // Import diferido: evita cargar `@avanzar/db` (que exige DATABASE_URL) al importar
  // este módulo. Solo se resuelve cuando el checkout dispara el aviso de verdad.
  getStoreSettings: async () => (await import("../store-settings")).getStoreSettings(),
  sendSms: realSendSms,
};

/**
 * Avisa por SMS que entró una orden nueva. Fire-and-forget: **nunca lanza**.
 * Guardas (en orden): sin token de env → no hace nada; toggle apagado o sin
 * números configurados → no hace nada. Envía a cada número y loguea el resultado.
 */
export async function notifyNewOrder(
  order: NewOrderInfo,
  deps: NotifyNewOrderDeps = defaultDeps,
): Promise<void> {
  try {
    const env = deps.loadEnv();
    if (!env.NOX_SMS_TOKEN_SECRET) return;

    const settings = await deps.getStoreSettings();
    if (!settings.notifySmsEnabled || settings.notifyPhones.length === 0) return;

    const message = buildNewOrderMessage(order, settings.businessName);
    const baseUrl = env.NOX_SMS_BASE_URL ?? DEFAULT_SMS_BASE_URL;

    for (const phone of settings.notifyPhones) {
      // try/catch por número: un fallo (aunque sendSms llegara a lanzar) no frena
      // el envío a los demás destinatarios.
      try {
        const result = await deps.sendSms(baseUrl, env.NOX_SMS_TOKEN_SECRET, phone, message);
        if (result.ok) {
          console.info(`[notify] SMS enviado a ${phone} (orden ${order.orderNumber})`);
        } else {
          console.warn(
            `[notify] Falló SMS a ${phone} (orden ${order.orderNumber}):`,
            result.status ?? result.error,
          );
        }
      } catch (e) {
        console.warn(`[notify] Error enviando SMS a ${phone} (orden ${order.orderNumber}):`, e);
      }
    }
  } catch (e) {
    // Nunca propagamos: el checkout no debe romperse por el aviso.
    console.error("[notify] Error inesperado enviando aviso de orden nueva:", e);
  }
}
