import { describe, expect, test, vi } from "vitest";
import { ApiError } from "./api";
import { createQueryClient, isUnauthorized } from "./queryClient";

describe("isUnauthorized", () => {
  test("true para ApiError 401", () => {
    expect(isUnauthorized(new ApiError(401, "no auth"))).toBe(true);
  });
  test("true para ApiError 403 (sin permiso → volver a login)", () => {
    expect(isUnauthorized(new ApiError(403, "forbidden"))).toBe(true);
  });
  test("false para otros errores", () => {
    expect(isUnauthorized(new ApiError(409, "conflict"))).toBe(false);
    expect(isUnauthorized(new Error("x"))).toBe(false);
  });
});

describe("createQueryClient", () => {
  test("invoca onUnauthorized cuando una query falla con 401", async () => {
    const onUnauthorized = vi.fn();
    const client = createQueryClient(onUnauthorized);
    await client
      .fetchQuery({
        queryKey: ["x"],
        queryFn: () => Promise.reject(new ApiError(401, "no auth")),
      })
      .catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
