import { useEffect, useState } from "react";
import { authClient } from "../lib/auth";
import { apiUrl } from "../lib/api";
import { money } from "../lib/money";
import { orderStatusLabel } from "../lib/order-status";
import { extractToken } from "../lib/claim";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  fulfillment: "pickup" | "delivery";
  currency: string;
  totalMinor: number;
  createdAt: string;
  receiptToken: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function messageForClaimError(status: number): string {
  if (status === 404) return "No encontramos ese pedido.";
  if (status === 409) return "Ese pedido ya está asociado a otra cuenta.";
  return "No pudimos vincular el pedido.";
}

export default function MyOrders() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [claimInput, setClaimInput] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  async function loadOrders() {
    try {
      const res = await fetch(apiUrl("/api/v1/orders"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("load failed");
      const body = (await res.json()) as { orders: OrderRow[] };
      setOrders(body.orders);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    if (session?.user) void loadOrders();
  }, [session?.user]);

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setClaimError(null);
    setClaimSuccess(null);
    const token = extractToken(claimInput);
    if (!token) {
      setClaimError("Link o código inválido.");
      return;
    }
    setClaiming(true);
    try {
      const res = await fetch(apiUrl("/api/v1/orders/claim"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setClaimError(messageForClaimError(res.status));
        return;
      }
      setClaimSuccess("¡Pedido vinculado a tu cuenta!");
      setClaimInput("");
      await loadOrders();
    } catch {
      setClaimError("No pudimos vincular el pedido.");
    } finally {
      setClaiming(false);
    }
  }

  if (sessionPending) return null;

  if (!session?.user) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          Ingresá para ver tus pedidos
        </h1>
        <div className="mt-6 flex justify-center gap-3">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            Ingresar
          </a>
          <a
            href="/registro"
            className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-6 py-2.5 text-sm font-semibold text-ink hover:border-brand-300"
          >
            Registrate
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        Mis pedidos
      </h1>

      {loadError && (
        <p className="mt-4 text-sm font-medium text-brand-700">
          No pudimos cargar tus pedidos. Probá de nuevo en un rato.
        </p>
      )}

      {orders && orders.length === 0 && (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-ink-soft">Todavía no tenés pedidos.</p>
          <a
            href="/productos"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            Ver productos
          </a>
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5"
            >
              <div>
                <p className="font-mono text-sm font-bold text-ink">{o.orderNumber}</p>
                <p className="text-xs text-muted">
                  {formatDate(o.createdAt)} ·{" "}
                  {o.fulfillment === "pickup" ? "Retiro" : "Domicilio"}
                </p>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {orderStatusLabel(o.status)}
              </span>
              <p className="font-semibold text-ink">
                {money(o.totalMinor, o.currency)}
              </p>
              <div className="flex gap-2">
                <a
                  href={`/seguimiento/${o.receiptToken}`}
                  className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink-soft hover:border-brand-300 hover:text-brand-700"
                >
                  Seguir
                </a>
                <a
                  href={`/api/v1/receipt/${o.receiptToken}`}
                  target="_blank"
                  rel="noopener"
                  className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink-soft hover:border-brand-300 hover:text-brand-700"
                >
                  Recibo
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          ¿Tenés un pedido como invitado?
        </h2>
        <form onSubmit={handleClaim} className="mt-4 flex flex-wrap gap-3">
          <label htmlFor="claim-input" className="sr-only">
            Pegá tu link de seguimiento o el código
          </label>
          <input
            id="claim-input"
            type="text"
            value={claimInput}
            onChange={(e) => setClaimInput(e.target.value)}
            placeholder="Pegá tu link de seguimiento o el código"
            className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-brand-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={claiming}
            className="inline-flex items-center justify-center rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-60"
          >
            {claiming ? "Vinculando…" : "Vincular"}
          </button>
        </form>
        {claimError && (
          <p className="mt-2 text-sm font-medium text-brand-700">{claimError}</p>
        )}
        {claimSuccess && (
          <p className="mt-2 text-sm font-medium text-jade-600">{claimSuccess}</p>
        )}
      </div>
    </section>
  );
}
