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
});
