import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import AccountLink from "./AccountLink.tsx";
import { authClient } from "../lib/auth";

vi.mock("../lib/auth", () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn(),
  },
}));

describe("AccountLink", () => {
  test("sin sesión muestra 'Ingresar' hacia /login", () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isPending: false,
    });
    render(<AccountLink />);
    const link = screen.getByRole("link", { name: /ingresar/i });
    expect(link).toHaveAttribute("href", "/login");
  });

  test("con sesión muestra el nombre y enlaza a /mis-pedidos", () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { name: "Ana Pérez", email: "ana@example.com" } },
      isPending: false,
    });
    render(<AccountLink />);
    const link = screen.getByRole("link", { name: /ana pérez|mis pedidos/i });
    expect(link).toHaveAttribute("href", "/mis-pedidos");
  });

  test("mientras carga no muestra 'Ingresar' de forma prematura", () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isPending: true,
    });
    render(<AccountLink />);
    expect(screen.queryByRole("link", { name: /ingresar/i })).toBeNull();
  });
});
