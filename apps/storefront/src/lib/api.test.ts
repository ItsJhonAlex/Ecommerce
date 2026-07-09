import { describe, expect, test, vi } from "vitest";
import { ApiError, apiGet, apiUrl } from "./api";

describe("apiUrl", () => {
  test("arma base + path sin query", () => {
    expect(apiUrl("/api/v1/products")).toBe(
      "http://localhost:3000/api/v1/products",
    );
  });
  test("agrega querystring y omite undefined / vacío", () => {
    const url = apiUrl("/api/v1/products", {
      currency: "CUP",
      page: 2,
      category: undefined,
      q: "",
    });
    expect(url).toBe(
      "http://localhost:3000/api/v1/products?currency=CUP&page=2",
    );
  });
  test("serializa números", () => {
    expect(apiUrl("/x", { minPrice: 0 })).toBe(
      "http://localhost:3000/x?minPrice=0",
    );
  });
});

describe("apiGet", () => {
  test("2xx → devuelve el JSON parseado", async () => {
    const data = { products: [], total: 0, page: 1, pageSize: 24 };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => data,
    });
    const result = await apiGet<typeof data>(
      "/api/v1/products",
      { currency: "USD" },
      { fetch: fetchMock as unknown as typeof fetch },
    );
    expect(result).toEqual(data);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/products?currency=USD",
    );
  });

  test("no-2xx → lanza ApiError con el status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "No encontrado", code: "not_found" }),
    });
    await expect(
      apiGet("/api/v1/products/x", undefined, {
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ status: 404 });

    const err = (await apiGet("/api/v1/products/x", undefined, {
      fetch: fetchMock as unknown as typeof fetch,
    }).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.code).toBe("not_found");
    expect(err.message).toBe("No encontrado");
  });

  test("no-2xx sin body JSON → ApiError con mensaje por defecto", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("no json");
      },
    });
    const err = (await apiGet("/x", undefined, {
      fetch: fetchMock as unknown as typeof fetch,
    }).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toBe("Error 500");
  });
});
