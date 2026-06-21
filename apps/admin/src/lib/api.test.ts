import { afterEach, describe, expect, test, vi } from "vitest";
import { ApiError, apiFetch } from "./api";

function mockFetch(status: number, body: unknown) {
  // spyOn (no asignación directa) para que vi.restoreAllMocks() lo limpie.
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("apiFetch", () => {
  test("devuelve el JSON parseado en 2xx", async () => {
    mockFetch(200, { orders: [] });
    const data = await apiFetch<{ orders: unknown[] }>("/api/v1/admin/orders");
    expect(data.orders).toEqual([]);
  });

  test("lanza ApiError con status y code en error", async () => {
    mockFetch(409, { error: "El pago no está pendiente", code: "X" });
    await expect(apiFetch("/api/v1/admin/payments/1/confirm", { method: "PATCH" }))
      .rejects.toMatchObject({ status: 409, code: "X" });
  });

  test("manda credentials include", async () => {
    const fn = mockFetch(200, {});
    await apiFetch("/api/v1/admin/orders");
    expect(fn).toHaveBeenCalledWith(
      "/api/v1/admin/orders",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
