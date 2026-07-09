import { describe, expect, test } from "vitest";
import {
  CURRENCY_COOKIE,
  getCurrencyFromCookieHeader,
  parseCurrency,
} from "./currency";

describe("parseCurrency", () => {
  test("valor ausente → USD", () => {
    expect(parseCurrency(null)).toBe("USD");
    expect(parseCurrency(undefined)).toBe("USD");
    expect(parseCurrency("")).toBe("USD");
  });
  test("valor inválido → USD", () => {
    expect(parseCurrency("EUR")).toBe("USD");
    expect(parseCurrency("xxx")).toBe("USD");
  });
  test("valor válido → esa moneda", () => {
    expect(parseCurrency("CUP")).toBe("CUP");
    expect(parseCurrency("USD")).toBe("USD");
  });
});

describe("getCurrencyFromCookieHeader", () => {
  test("header nulo → USD", () => {
    expect(getCurrencyFromCookieHeader(null)).toBe("USD");
  });
  test("cookie ausente → USD", () => {
    expect(getCurrencyFromCookieHeader("other=x; foo=bar")).toBe("USD");
  });
  test("valor inválido → USD", () => {
    expect(getCurrencyFromCookieHeader("currency=EUR")).toBe("USD");
  });
  test("valor válido entre otras cookies → esa moneda", () => {
    expect(getCurrencyFromCookieHeader("currency=CUP; other=x")).toBe("CUP");
    expect(getCurrencyFromCookieHeader("a=1; currency=CUP")).toBe("CUP");
  });
});

describe("CURRENCY_COOKIE", () => {
  test("es 'currency'", () => {
    expect(CURRENCY_COOKIE).toBe("currency");
  });
});
