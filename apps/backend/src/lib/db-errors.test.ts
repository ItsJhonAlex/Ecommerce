import { describe, expect, test } from "bun:test";
import { isUniqueViolation } from "./db-errors";

describe("isUniqueViolation", () => {
  test("true para un error con code 23505 (unique_violation de Postgres)", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  test("false para otros códigos de Postgres", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
  });

  test("false para un Error común sin code", () => {
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
  });

  test("false para null/undefined/string", () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
  });

  // Drizzle 0.45 envuelve errores fuera de transacción en DrizzleQueryError,
  // con el PostgresError original en `cause`.
  test("true cuando el code 23505 está en cause (DrizzleQueryError)", () => {
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
  });

  test("false cuando cause tiene otro código", () => {
    expect(isUniqueViolation({ cause: { code: "23503" } })).toBe(false);
  });

  test("false cuando cause es null", () => {
    expect(isUniqueViolation({ cause: null })).toBe(false);
  });
});
