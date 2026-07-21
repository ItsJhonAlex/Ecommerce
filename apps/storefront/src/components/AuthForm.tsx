import { useState } from "react";
import { authClient } from "../lib/auth";
import { apiUrl } from "../lib/api";
import { getPendingClaimToken, clearPendingClaimToken } from "../lib/claim";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

type Props = { mode: "login" | "register" };

/** Reclama best-effort el pedido pendiente (si hay) tras autenticarse. No bloquea el redirect si falla. */
async function claimPendingIfAny(): Promise<void> {
  const token = getPendingClaimToken();
  if (!token) return;
  try {
    await fetch(apiUrl("/api/v1/orders/claim"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });
  } catch {
    // best-effort: si falla, el cliente igual puede reclamarlo manualmente
    // después desde /mis-pedidos.
  } finally {
    clearPendingClaimToken();
  }
}

export default function AuthForm({ mode }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): string | null {
    if (mode === "register" && name.trim() === "") {
      return "Ingresá tu nombre.";
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return "Ingresá un email válido.";
    }
    if (password.length < MIN_PASSWORD) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);

    const result =
      mode === "register"
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
          })
        : await authClient.signIn.email({ email: email.trim(), password });

    if (result.error) {
      setError(result.error.message ?? "No pudimos completar la operación.");
      setSubmitting(false);
      return;
    }

    await claimPendingIfAny();
    window.location.href = "/mis-pedidos";
  }

  const isRegister = mode === "register";

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {isRegister ? "Creá tu cuenta" : "Ingresá a tu cuenta"}
        </h1>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 flex flex-col gap-4"
        >
          {isRegister && (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
              Nombre completo
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-brand-400 focus:outline-none"
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-brand-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line bg-paper px-4 py-2.5 text-ink focus:border-brand-400 focus:outline-none"
            />
          </label>
          {error && (
            <p className="text-sm font-medium text-brand-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting
              ? "Un momento…"
              : isRegister
                ? "Crear cuenta"
                : "Ingresar"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-soft">
          {isRegister ? (
            <>
              ¿Ya tenés cuenta?{" "}
              <a href="/login" className="font-semibold text-brand-700 hover:underline">
                Ingresá
              </a>
            </>
          ) : (
            <>
              ¿No tenés cuenta?{" "}
              <a href="/registro" className="font-semibold text-brand-700 hover:underline">
                Registrate
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
