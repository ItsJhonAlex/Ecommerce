import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test, vi } from "vitest";
import { server } from "@/test/setup";
import { renderWithProviders } from "@/test/utils";
import { UsersPage } from "./UsersPage";

const user = {
  id: "u1",
  name: "Ana",
  email: "ana@x.com",
  role: "customer",
  emailVerified: true,
  image: null,
  createdAt: "2026-06-20T10:00:00.000Z",
};

describe("UsersPage", () => {
  test("renderiza usuarios con su rol", async () => {
    server.use(
      http.get("/api/v1/admin/users", () => HttpResponse.json({ users: [user] })),
    );
    renderWithProviders(<UsersPage />, { path: "/users" });
    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("ana@x.com")).toBeInTheDocument();
    const badge = document.querySelector('[data-status="customer"]');
    expect(badge).toHaveTextContent("Cliente");
  });

  test("cambiar rol PATCHea /:id/role", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let received: unknown = null;
    server.use(
      http.get("/api/v1/admin/users", () => HttpResponse.json({ users: [user] })),
      http.patch("/api/v1/admin/users/u1/role", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ user: { ...user, role: "staff" } });
      }),
    );
    renderWithProviders(<UsersPage />, { path: "/users" });
    const select = await screen.findByLabelText("Rol de Ana");
    await userEvent.selectOptions(select, "staff");
    await waitFor(() => expect(received).toEqual({ role: "staff" }));
  });
});
