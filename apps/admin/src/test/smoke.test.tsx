import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderWithProviders } from "./utils";

describe("harness de tests", () => {
  test("renderiza un componente trivial con providers", () => {
    renderWithProviders(<h1>hola admin</h1>);
    expect(screen.getByRole("heading", { name: "hola admin" })).toBeInTheDocument();
  });
});
