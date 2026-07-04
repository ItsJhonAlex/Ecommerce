import { describe, expect, test } from "bun:test";
import { envSchema } from "./env";

describe("envSchema", () => {
  test("parsea un entorno válido y aplica el default de PORT", () => {
    const r = envSchema.safeParse({
      DATABASE_URL: "postgres://u:p@localhost:5433/db",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:3000",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.PORT).toBe(3000);
  });

  test("coerce PORT desde string", () => {
    const r = envSchema.safeParse({
      DATABASE_URL: "x",
      BETTER_AUTH_SECRET: "s",
      BETTER_AUTH_URL: "http://localhost:3000",
      PORT: "8080",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.PORT).toBe(8080);
  });

  test("falla si falta BETTER_AUTH_SECRET", () => {
    const r = envSchema.safeParse({
      DATABASE_URL: "x",
      BETTER_AUTH_URL: "http://localhost:3000",
    });
    expect(r.success).toBe(false);
  });

  test("falla si BETTER_AUTH_URL no es una URL", () => {
    const r = envSchema.safeParse({
      DATABASE_URL: "x",
      BETTER_AUTH_SECRET: "s",
      BETTER_AUTH_URL: "no-es-url",
    });
    expect(r.success).toBe(false);
  });
});

describe("envSchema — NOX_SMS_* opcionales", () => {
  const base = {
    DATABASE_URL: "x",
    BETTER_AUTH_SECRET: "s",
    BETTER_AUTH_URL: "http://localhost:3000",
  };

  test("string vacío (.env sin setear) → válido, se normaliza a undefined", () => {
    const r = envSchema.safeParse({
      ...base,
      NOX_SMS_TOKEN_SECRET: "",
      NOX_SMS_BASE_URL: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.NOX_SMS_TOKEN_SECRET).toBeUndefined();
      expect(r.data.NOX_SMS_BASE_URL).toBeUndefined();
    }
  });

  test("valores presentes → se conservan", () => {
    const r = envSchema.safeParse({
      ...base,
      NOX_SMS_TOKEN_SECRET: "OTP-abc",
      NOX_SMS_BASE_URL: "https://otp.example/api/v2",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.NOX_SMS_TOKEN_SECRET).toBe("OTP-abc");
      expect(r.data.NOX_SMS_BASE_URL).toBe("https://otp.example/api/v2");
    }
  });

  test("NOX_SMS_BASE_URL con URL inválida → falla", () => {
    const r = envSchema.safeParse({ ...base, NOX_SMS_BASE_URL: "no-url" });
    expect(r.success).toBe(false);
  });
});
