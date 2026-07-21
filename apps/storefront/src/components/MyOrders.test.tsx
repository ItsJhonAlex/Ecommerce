import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import MyOrders from "./MyOrders.tsx";
import { authClient } from "../lib/auth";

vi.mock("../lib/auth", () => ({
  authClient: { useSession: vi.fn() },
}));

const SESSION = { data: { user: { name: "Ana" } }, isPending: false };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MyOrders — sin sesión", () => {
  test("muestra invitación a ingresar/registrarse", () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isPending: false,
    });
    render(<MyOrders />);
    expect(screen.getByText(/ingresá para ver tus pedidos/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ingresar/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});

describe("MyOrders — con sesión", () => {
  test("lista los pedidos con estado y links", async () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue(SESSION);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        orders: [
          {
            id: "o1",
            orderNumber: "A-1",
            status: "paid",
            fulfillment: "pickup",
            currency: "USD",
            totalMinor: 5000,
            createdAt: "2026-07-01T10:00:00.000Z",
            receiptToken: "tok-1",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MyOrders />);
    expect(await screen.findByText("A-1")).toBeInTheDocument();
    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /seguir/i })).toHaveAttribute(
      "href",
      "/seguimiento/tok-1",
    );
    expect(screen.getByRole("link", { name: /recibo/i })).toHaveAttribute(
      "href",
      "/api/v1/receipt/tok-1",
    );
    vi.unstubAllGlobals();
  });

  test("empty state cuando no hay pedidos", async () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue(SESSION);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ orders: [] }) }),
    );
    render(<MyOrders />);
    expect(await screen.findByText(/todavía no tenés pedidos/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  test("reclamo manual exitoso refresca la lista", async () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue(SESSION);
    const UUID = "22222222-2222-4222-8222-222222222222";
    const fetchMock = vi
      .fn()
      // GET /orders inicial: vacío
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ orders: [] }) })
      // POST /orders/claim: éxito
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ order: {} }) })
      // GET /orders refetch: 1 pedido
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          orders: [
            {
              id: "o2",
              orderNumber: "A-2",
              status: "pending_payment",
              fulfillment: "delivery",
              currency: "USD",
              totalMinor: 2000,
              createdAt: "2026-07-02T10:00:00.000Z",
              receiptToken: UUID,
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<MyOrders />);
    await screen.findByText(/todavía no tenés pedidos/i);

    fireEvent.change(screen.getByLabelText(/link de seguimiento o el código/i), {
      target: { value: UUID },
    });
    fireEvent.click(screen.getByRole("button", { name: /vincular/i }));

    expect(await screen.findByText("A-2")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  test("reclamo manual con token inválido muestra error sin llamar a la API", () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue(SESSION);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ orders: [] }) }),
    );
    render(<MyOrders />);
    fireEvent.change(screen.getByLabelText(/link de seguimiento o el código/i), {
      target: { value: "esto no es un token" },
    });
    fireEvent.click(screen.getByRole("button", { name: /vincular/i }));
    expect(screen.getByText(/link o código inválido/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  test("reclamo manual con 404 muestra mensaje de no encontrado", async () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue(SESSION);
    const UUID = "33333333-3333-4333-8333-333333333333";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ orders: [] }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Pedido no encontrado" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<MyOrders />);
    await screen.findByText(/todavía no tenés pedidos/i);
    fireEvent.change(screen.getByLabelText(/link de seguimiento o el código/i), {
      target: { value: UUID },
    });
    fireEvent.click(screen.getByRole("button", { name: /vincular/i }));
    expect(await screen.findByText(/no encontramos ese pedido/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
