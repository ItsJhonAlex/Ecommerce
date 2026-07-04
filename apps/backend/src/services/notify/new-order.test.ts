import { describe, expect, mock, test } from "bun:test";
import { notifyNewOrder, type NotifyNewOrderDeps } from "./new-order";
import type { SendSmsResult } from "./sms";

const order = {
  orderNumber: "A-1",
  totalMinor: 5000,
  currency: "USD",
  fulfillment: "pickup" as const,
};

/**
 * Enfoque (b): inyección de dependencias. `notifyNewOrder(order, deps)` acepta deps
 * opcionales; la firma pública `notifyNewOrder(order)` que usa el checkout no cambia.
 * Esto evita tocar el cache memoizado de `loadEnv` y la conexión real a la DB de
 * `getStoreSettings`, y hace determinístico el control del env (con/sin token).
 */
function makeDeps(over: {
  token?: string;
  notifySmsEnabled?: boolean;
  notifyPhones?: string[];
  sendSms?: NotifyNewOrderDeps["sendSms"];
}): {
  deps: NotifyNewOrderDeps;
  sendSms: ReturnType<typeof mock>;
} {
  const sendSms =
    (over.sendSms as ReturnType<typeof mock>) ??
    mock(async (): Promise<SendSmsResult> => ({ ok: true, status: 200 }));
  const deps: NotifyNewOrderDeps = {
    loadEnv: () => ({
      NOX_SMS_BASE_URL: "https://sms.example.test/api",
      NOX_SMS_TOKEN_SECRET: over.token,
    }),
    getStoreSettings: async () => ({
      businessName: "Avanzar",
      notifySmsEnabled: over.notifySmsEnabled ?? true,
      notifyPhones: over.notifyPhones ?? [],
    }),
    sendSms,
  };
  return { deps, sendSms };
}

describe("notifyNewOrder", () => {
  test("toggle off → no llama a sendSms", async () => {
    const { deps, sendSms } = makeDeps({
      token: "secret",
      notifySmsEnabled: false,
      notifyPhones: ["+5351111111"],
    });
    await notifyNewOrder(order, deps);
    expect(sendSms).toHaveBeenCalledTimes(0);
  });

  test("toggle on + 2 números + token → llama a sendSms 2 veces con el mensaje esperado", async () => {
    const { deps, sendSms } = makeDeps({
      token: "secret",
      notifySmsEnabled: true,
      notifyPhones: ["+5351111111", "+5352222222"],
    });
    await notifyNewOrder(order, deps);
    expect(sendSms).toHaveBeenCalledTimes(2);

    // El 3er arg es un número; el 4to es el mensaje.
    const call = sendSms.mock.calls[0]!;
    expect(call[2]).toBe("+5351111111");
    expect(typeof call[3]).toBe("string");
    expect(call[3]).toContain("nueva orden A-1");
    expect(call[3]).toContain("50.00 USD");
    expect(sendSms.mock.calls[1]?.[2]).toBe("+5352222222");
  });

  test("sendSms que lanza → notifyNewOrder resuelve sin throw", async () => {
    const throwing = mock(async () => {
      throw new Error("boom");
    });
    const { deps, sendSms } = makeDeps({
      token: "secret",
      notifySmsEnabled: true,
      notifyPhones: ["+5351111111"],
      sendSms: throwing as unknown as NotifyNewOrderDeps["sendSms"],
    });
    // No debe lanzar.
    await expect(notifyNewOrder(order, deps)).resolves.toBeUndefined();
    expect(sendSms).toHaveBeenCalledTimes(1);
  });

  test("sin token en env → no llama a sendSms", async () => {
    const { deps, sendSms } = makeDeps({
      token: undefined,
      notifySmsEnabled: true,
      notifyPhones: ["+5351111111"],
    });
    await notifyNewOrder(order, deps);
    expect(sendSms).toHaveBeenCalledTimes(0);
  });
});
