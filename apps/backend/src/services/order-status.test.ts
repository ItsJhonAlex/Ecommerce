import { describe, expect, test } from "bun:test";
import { allowedTransitions, canTransition } from "./order-status";

describe("canTransition — domicilio", () => {
  test("camino de domicilio", () => {
    expect(canTransition("pending_payment", "paid", "delivery")).toBe(true);
    expect(canTransition("paid", "preparing", "delivery")).toBe(true);
    expect(canTransition("preparing", "shipped", "delivery")).toBe(true);
    expect(canTransition("shipped", "delivered", "delivery")).toBe(true);
  });
  test("domicilio no permite el camino de retiro", () => {
    expect(canTransition("preparing", "delivered", "delivery")).toBe(false);
    expect(canTransition("preparing", "ready_for_pickup", "delivery")).toBe(false);
  });
  test("cancelable antes de shipped, no después", () => {
    expect(canTransition("preparing", "cancelled", "delivery")).toBe(true);
    expect(canTransition("shipped", "cancelled", "delivery")).toBe(false);
  });
});

describe("canTransition — retiro", () => {
  test("camino de retiro", () => {
    expect(canTransition("paid", "preparing", "pickup")).toBe(true);
    expect(canTransition("preparing", "ready_for_pickup", "pickup")).toBe(true);
    expect(canTransition("ready_for_pickup", "delivered", "pickup")).toBe(true);
  });
  test("retiro no usa shipped", () => {
    expect(canTransition("preparing", "shipped", "pickup")).toBe(false);
  });
  test("cancelable hasta antes de retirar", () => {
    expect(canTransition("ready_for_pickup", "cancelled", "pickup")).toBe(true);
    expect(canTransition("delivered", "cancelled", "pickup")).toBe(false);
  });
});

describe("allowedTransitions", () => {
  test("por método desde preparing", () => {
    expect(allowedTransitions("pickup", "preparing")).toEqual(["ready_for_pickup", "cancelled"]);
    expect(allowedTransitions("delivery", "preparing")).toEqual(["shipped", "cancelled"]);
  });
});
