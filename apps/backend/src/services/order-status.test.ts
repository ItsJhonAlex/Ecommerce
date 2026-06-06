import { describe, expect, test } from "bun:test";
import { ALLOWED_TRANSITIONS, canTransition } from "./order-status";

describe("canTransition", () => {
  test("permite el avance hacia adelante de la cadena", () => {
    expect(canTransition("pending_payment", "paid")).toBe(true);
    expect(canTransition("paid", "preparing")).toBe(true);
    expect(canTransition("preparing", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
  });

  test("permite cancelar antes de shipped", () => {
    expect(canTransition("pending_payment", "cancelled")).toBe(true);
    expect(canTransition("paid", "cancelled")).toBe(true);
    expect(canTransition("preparing", "cancelled")).toBe(true);
  });

  test("no permite cancelar una vez shipped o delivered", () => {
    expect(canTransition("shipped", "cancelled")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
  });

  test("no permite retroceder en la cadena", () => {
    expect(canTransition("paid", "pending_payment")).toBe(false);
    expect(canTransition("shipped", "preparing")).toBe(false);
    expect(canTransition("delivered", "shipped")).toBe(false);
  });

  test("estados terminales no tienen transiciones de salida", () => {
    expect(ALLOWED_TRANSITIONS.delivered).toEqual([]);
    expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
  });

  test("no permite transiciones al mismo estado", () => {
    expect(canTransition("paid", "paid")).toBe(false);
  });
});
