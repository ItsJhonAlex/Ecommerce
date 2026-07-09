import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import CurrencySelect from "./CurrencySelect.tsx";
import { setCurrencyCookie } from "../lib/currency";

// Mockeamos la persistencia de cookie para asertar la llamada sin tocar document.
vi.mock("../lib/currency", () => ({
  setCurrencyCookie: vi.fn(),
}));

const reload = vi.fn();

describe("CurrencySelect", () => {
  beforeEach(() => {
    // location.reload no es configurable en jsdom: stubeamos todo `location`.
    vi.stubGlobal("location", { reload });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  test("renderiza las opciones USD y CUP con el valor inicial de la prop", () => {
    render(<CurrencySelect value="USD" />);

    const select = screen.getByRole("combobox", { name: "Moneda" });
    expect(select).toHaveValue("USD");
    expect(screen.getByRole("option", { name: "USD" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "CUP" })).toBeInTheDocument();
  });

  test("respeta un valor inicial distinto (CUP)", () => {
    render(<CurrencySelect value="CUP" />);
    expect(screen.getByRole("combobox", { name: "Moneda" })).toHaveValue("CUP");
  });

  test("al cambiar a CUP persiste la cookie y recarga", () => {
    render(<CurrencySelect value="USD" />);

    fireEvent.change(screen.getByRole("combobox", { name: "Moneda" }), {
      target: { value: "CUP" },
    });

    expect(setCurrencyCookie).toHaveBeenCalledWith("CUP");
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
