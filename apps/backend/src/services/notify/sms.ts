/** Resultado de un intento de envío de SMS. Nunca lanza: el error viaja en el objeto. */
export interface SendSmsResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/** Timeout del request a la API de SMS (ms). */
const SMS_TIMEOUT_MS = 5000;

/**
 * Envía un SMS vía la API de noxcreation. Nunca lanza: ante error de red o
 * timeout captura y devuelve `{ ok: false, error }`. El timeout usa AbortController.
 */
export async function sendSms(
  baseUrl: string,
  tokenSecret: string,
  phoneNumber: string,
  message: string,
): Promise<SendSmsResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SMS_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-token-secret": tokenSecret,
      },
      body: JSON.stringify({ phoneNumber, message }),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  } finally {
    clearTimeout(timeout);
  }
}
