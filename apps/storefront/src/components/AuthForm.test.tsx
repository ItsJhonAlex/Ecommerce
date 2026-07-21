import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import AuthForm from "./AuthForm.tsx";
import { authClient } from "../lib/auth";
import { setPendingClaimToken, getPendingClaimToken } from "../lib/claim";

vi.mock("../lib/auth", () => ({
  authClient: {
    signUp: { email: vi.fn() },
    signIn: { email: vi.fn() },
  },
}));

const originalLocation = window.location;

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  // @ts-expect-error -- redefinimos location para espiar el redirect
  delete window.location;
  // @ts-expect-error -- reasignamos el stub de location (no tipa bajo strict)
  window.location = { ...originalLocation, href: "" } as Location;
});

describe("AuthForm — modo registro", () => {
  test("bloquea el submit con email inválido", async () => {
    render(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: "no-es-email" },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: "password1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(await screen.findByText(/email válido/i)).toBeInTheDocument();
    expect(authClient.signUp.email).not.toHaveBeenCalled();
  });

  test("bloquea el submit con contraseña corta", async () => {
    render(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(await screen.findByText(/al menos 8/i)).toBeInTheDocument();
    expect(authClient.signUp.email).not.toHaveBeenCalled();
  });

  test("submit exitoso sin token pendiente redirige a /mis-pedidos", async () => {
    (authClient.signUp.email as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    render(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: "password1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await waitFor(() => expect(window.location.href).toBe("/mis-pedidos"));
    expect(authClient.signUp.email).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@example.com",
      password: "password1234",
    });
  });

  test("submit exitoso con token pendiente lo reclama y lo limpia", async () => {
    setPendingClaimToken("11111111-1111-4111-8111-111111111111");
    (authClient.signUp.email as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: "password1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body)).toEqual({
      token: "11111111-1111-4111-8111-111111111111",
    });
    await waitFor(() => expect(getPendingClaimToken()).toBeNull());
    vi.unstubAllGlobals();
  });

  test("muestra el error del server (email ya registrado)", async () => {
    (authClient.signUp.email as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: "El email ya está registrado" },
    });
    render(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: "password1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(
      await screen.findByText(/el email ya está registrado/i),
    ).toBeInTheDocument();
  });
});

describe("AuthForm — modo login", () => {
  test("submit exitoso redirige a /mis-pedidos", async () => {
    (authClient.signIn.email as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: "password1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));
    await waitFor(() => expect(window.location.href).toBe("/mis-pedidos"));
  });

  test("muestra credenciales inválidas", async () => {
    (authClient.signIn.email as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: "Credenciales inválidas" },
    });
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: "wrongpass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));
    expect(
      await screen.findByText(/credenciales inválidas/i),
    ).toBeInTheDocument();
  });
});
