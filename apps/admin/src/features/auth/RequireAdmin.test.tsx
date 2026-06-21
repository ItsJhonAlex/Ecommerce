import { screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock del cliente de auth: controlamos useSession por test.
const useSession = vi.fn();
vi.mock("@/lib/auth", () => ({ authClient: { useSession: () => useSession() } }));

import { RequireAdmin } from "./RequireAdmin";

function renderAt(session: unknown, isPending = false) {
  useSession.mockReturnValue({ data: session, isPending });
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <RequireAdmin />,
        children: [{ index: true, element: <div>contenido admin</div> }],
      },
      { path: "/login", element: <div>pantalla login</div> },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("RequireAdmin", () => {
  test("renderiza el contenido si la sesión es admin", () => {
    renderAt({ user: { role: "admin", email: "a@b.c" } });
    expect(screen.getByText("contenido admin")).toBeInTheDocument();
  });

  test("renderiza el contenido si la sesión es staff", () => {
    renderAt({ user: { role: "staff", email: "a@b.c" } });
    expect(screen.getByText("contenido admin")).toBeInTheDocument();
  });

  test("redirige a /login sin sesión", () => {
    renderAt(null);
    expect(screen.getByText("pantalla login")).toBeInTheDocument();
  });

  test("redirige a /login si el rol no es admin", () => {
    renderAt({ user: { role: "customer", email: "a@b.c" } });
    expect(screen.getByText("pantalla login")).toBeInTheDocument();
  });

  test("muestra estado de carga mientras la sesión está pendiente", () => {
    renderAt(null, true);
    expect(screen.getByLabelText("Cargando")).toBeInTheDocument();
    expect(screen.queryByText("contenido admin")).not.toBeInTheDocument();
    expect(screen.queryByText("pantalla login")).not.toBeInTheDocument();
  });
});
