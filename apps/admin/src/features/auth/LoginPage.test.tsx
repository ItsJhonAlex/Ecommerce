import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

const signInEmail = vi.fn();
const signOut = vi.fn();
const useSession = vi.fn().mockReturnValue({ data: null, isPending: false });
vi.mock("@/lib/auth", () => ({
  authClient: {
    signIn: { email: (...a: unknown[]) => signInEmail(...a) },
    signOut: () => signOut(),
    useSession: () => useSession(),
  },
}));

import { LoginPage } from "./LoginPage";

function renderLogin() {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <LoginPage /> },
      { path: "/orders", element: <div>lista de pedidos</div> },
    ],
    { initialEntries: ["/login"] },
  );
  return render(<RouterProvider router={router} />);
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText("Email"), "admin@avanzar.test");
  await userEvent.type(screen.getByLabelText("Contraseña"), "supersecret123");
  await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
}

beforeEach(() => vi.clearAllMocks());

describe("LoginPage", () => {
  test("login admin exitoso navega a /orders", async () => {
    signInEmail.mockResolvedValue({ data: { user: { role: "admin" } }, error: null });
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByText("lista de pedidos")).toBeInTheDocument();
  });

  test("credenciales inválidas muestran error", async () => {
    signInEmail.mockResolvedValue({ data: null, error: { message: "Credenciales inválidas" } });
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByText(/credenciales inválidas/i)).toBeInTheDocument();
  });

  test("usuario no-admin es rechazado y deslogueado", async () => {
    signInEmail.mockResolvedValue({ data: { user: { role: "customer" } }, error: null });
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByText(/no tenés permisos/i)).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
  });
});
