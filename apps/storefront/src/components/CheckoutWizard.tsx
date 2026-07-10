import { useStore } from "@nanostores/react";
import { useMemo, useState } from "react";
import {
  $cart,
  clearCart,
  linesUnavailableIn,
  subtotalMinor,
  type CartLine,
} from "../stores/cart";
import type { SupportedCurrency } from "@avanzar/shared";
import { apiUrl } from "../lib/api";
import { getCurrencyClient } from "../lib/currency";
import { money } from "../lib/money";

/** Tarifa de envío (subset que la isla necesita — el server valida y recalcula). */
type ShippingRate = {
  province: string;
  amountMinor: number;
  currency: string;
};

type Props = {
  shippingRates: ShippingRate[];
  storeName: string;
  storeAddress: string | null;
};

type Fulfillment = "pickup" | "delivery";
type PaymentMethod = "zelle" | "transfer_local" | "cod";

type BuyerForm = { name: string; email: string; phone: string };
type RecipientForm = {
  name: string;
  phone: string;
  province: string;
  municipality: string;
  addressLine: string;
  reference: string;
};

type FormState = {
  buyer: BuyerForm;
  fulfillment: Fulfillment;
  recipient: RecipientForm;
  paymentMethod: PaymentMethod;
};

type SuccessOrder = {
  orderNumber: string;
  receiptToken: string;
  totalMinor: number;
  currency: string;
  paymentMethod: PaymentMethod;
};

/** Regex simple de email (misma verificación que el spec pide en cliente). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Método de pago por defecto según moneda (el spec fija USD→zelle, CUP→transfer_local). */
function defaultPaymentFor(currency: string): PaymentMethod {
  return currency === "USD" ? "zelle" : "transfer_local";
}

/** Label humano para el método de pago (español, mostrado en la confirmación). */
function paymentLabel(method: PaymentMethod): string {
  switch (method) {
    case "zelle":
      return "Zelle";
    case "transfer_local":
      return "Transferencia local";
    case "cod":
      return "Contra entrega";
  }
}

const STEP_LABELS = ["Contacto", "Entrega", "Pago", "Revisión"] as const;

/**
 * Isla: wizard de checkout de 4 pasos.
 *
 * Lee `$cart` y la moneda activa. Construye el `CheckoutInput` (contrato de
 * `packages/shared/src/checkout.ts`) y lo POSTea a `/api/v1/checkout` con
 * `credentials:"include"`. 201 → vaciar carrito + estado de éxito inline; 422
 * → mensaje según `code`. El submit se hace con `fetch` directo porque `apiGet`
 * es sólo GET.
 */
export default function CheckoutWizard({
  shippingRates,
  storeName: _storeName,
  storeAddress,
}: Props) {
  const lines = useStore($cart);
  const currency = getCurrencyClient();

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [form, setForm] = useState<FormState>(() => ({
    buyer: { name: "", email: "", phone: "" },
    fulfillment: "pickup",
    recipient: {
      name: "",
      phone: "",
      province: "",
      municipality: "",
      addressLine: "",
      reference: "",
    },
    paymentMethod: defaultPaymentFor(currency),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<SuccessOrder | null>(null);

  // Si la moneda cambia entre steps (edge case) y el método actual no aplica,
  // lo forzamos al default de la moneda para no mandar payload inválido.
  const paymentMethodForCurrency: PaymentMethod = useMemo(() => {
    if (currency === "USD") return "zelle";
    if (form.paymentMethod === "zelle") return "transfer_local";
    return form.paymentMethod;
  }, [currency, form.paymentMethod]);

  const unavailable = useMemo(
    () => linesUnavailableIn(lines, currency),
    [lines, currency],
  );
  const hasUnavailable = unavailable.length > 0;

  const subtotal = subtotalMinor(lines, currency);
  const selectedRate =
    form.fulfillment === "delivery" && form.recipient.province
      ? (shippingRates.find((r) => r.province === form.recipient.province) ??
        null)
      : null;
  const shippingCost = selectedRate?.amountMinor ?? 0;
  const estimatedTotal = subtotal + shippingCost;

  // ----- Éxito inline -------------------------------------------------------
  if (successOrder) {
    return <SuccessPanel order={successOrder} />;
  }

  // ----- Carrito vacío ------------------------------------------------------
  if (lines.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-surface px-6 py-14 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Tu carrito está vacío
          </h1>
          <p className="max-w-md text-sm text-ink-soft">
            No podés hacer un pedido sin productos. Explorá el catálogo y sumá
            algo primero.
          </p>
          <a
            href="/productos"
            className="mt-2 inline-flex items-center rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            Ver productos
          </a>
        </div>
      </section>
    );
  }

  // ----- Helpers de estado --------------------------------------------------
  function setBuyer(patch: Partial<BuyerForm>) {
    setForm((f) => ({ ...f, buyer: { ...f.buyer, ...patch } }));
  }
  function setRecipient(patch: Partial<RecipientForm>) {
    setForm((f) => ({ ...f, recipient: { ...f.recipient, ...patch } }));
  }

  function validateStep(current: 0 | 1 | 2 | 3): Record<string, string> {
    const errs: Record<string, string> = {};
    if (current === 0) {
      if (!form.buyer.name.trim()) errs["buyer.name"] = "Requerido";
      if (!form.buyer.email.trim()) errs["buyer.email"] = "Requerido";
      else if (!EMAIL_REGEX.test(form.buyer.email.trim()))
        errs["buyer.email"] = "Email inválido";
      if (!form.buyer.phone.trim()) errs["buyer.phone"] = "Requerido";
    } else if (current === 1) {
      if (!form.recipient.name.trim()) errs["recipient.name"] = "Requerido";
      if (!form.recipient.phone.trim()) errs["recipient.phone"] = "Requerido";
      if (form.fulfillment === "delivery") {
        if (!form.recipient.province.trim())
          errs["recipient.province"] = "Elegí una provincia";
        if (!form.recipient.municipality.trim())
          errs["recipient.municipality"] = "Requerido";
        if (!form.recipient.addressLine.trim())
          errs["recipient.addressLine"] = "Requerido";
      }
    }
    return errs;
  }

  function goNext() {
    const errs = validateStep(step);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (step < 3) setStep((step + 1) as 0 | 1 | 2 | 3);
  }

  function goBack() {
    setErrors({});
    setSubmitError(null);
    if (step > 0) setStep((step - 1) as 0 | 1 | 2 | 3);
  }

  async function handleSubmit() {
    if (hasUnavailable) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const recipient =
        form.fulfillment === "pickup"
          ? {
              name: form.recipient.name.trim(),
              phone: form.recipient.phone.trim(),
            }
          : {
              name: form.recipient.name.trim(),
              phone: form.recipient.phone.trim(),
              province: form.recipient.province.trim(),
              municipality: form.recipient.municipality.trim(),
              addressLine: form.recipient.addressLine.trim(),
              ...(form.recipient.reference.trim()
                ? { reference: form.recipient.reference.trim() }
                : {}),
            };

      const payload = {
        currency,
        fulfillment: form.fulfillment,
        buyer: {
          name: form.buyer.name.trim(),
          email: form.buyer.email.trim(),
          phone: form.buyer.phone.trim(),
        },
        recipient,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
        payment: { method: paymentMethodForCurrency },
      };

      const res = await fetch(apiUrl("/api/v1/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.status === 201) {
        const body = (await res.json()) as {
          order: {
            orderNumber: string;
            receiptToken: string;
            totalMinor: number;
            currency: string;
          };
        };
        clearCart();
        setSuccessOrder({
          orderNumber: body.order.orderNumber,
          receiptToken: body.order.receiptToken,
          totalMinor: body.order.totalMinor,
          currency: body.order.currency,
          paymentMethod: paymentMethodForCurrency,
        });
        return;
      }

      let code: string | undefined;
      try {
        const errBody = (await res.json()) as { error?: string; code?: string };
        code = errBody.code;
      } catch {
        // sin body JSON — dejamos code undefined
      }
      setSubmitError(messageForCode(code));
    } catch {
      setSubmitError(messageForCode(undefined));
    } finally {
      setSubmitting(false);
    }
  }

  // ----- Render principal ---------------------------------------------------
  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Finalizá tu pedido
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Completá los datos en 4 pasos. No pagás online; te contactaremos para
          coordinar.
        </p>
      </header>

      <Steps current={step} />

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        {step === 0 && (
          <StepContact
            buyer={form.buyer}
            setBuyer={setBuyer}
            errors={errors}
          />
        )}
        {step === 1 && (
          <StepFulfillment
            form={form}
            setForm={setForm}
            setRecipient={setRecipient}
            shippingRates={shippingRates}
            storeAddress={storeAddress}
            currency={currency}
            selectedRate={selectedRate}
            errors={errors}
          />
        )}
        {step === 2 && (
          <StepPayment
            currency={currency}
            method={paymentMethodForCurrency}
            onChange={(m) => setForm((f) => ({ ...f, paymentMethod: m }))}
          />
        )}
        {step === 3 && (
          <StepReview
            form={form}
            paymentMethod={paymentMethodForCurrency}
            lines={lines}
            currency={currency}
            subtotal={subtotal}
            shippingCost={shippingCost}
            estimatedTotal={estimatedTotal}
            selectedRate={selectedRate}
            storeAddress={storeAddress}
            unavailableCount={unavailable.length}
            submitError={submitError}
          />
        )}
      </div>

      <nav className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0 || submitting}
          className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Atrás
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || hasUnavailable}
            className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70"
          >
            {submitting ? "Enviando..." : "Confirmar pedido"}
          </button>
        )}
      </nav>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes por paso — mantenidos en el mismo archivo para leer un solo
// flujo sin saltar entre módulos. Todos consumen props locales del wizard.

function Steps({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs font-medium">
      {STEP_LABELS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                active
                  ? "bg-brand-500 text-white"
                  : done
                    ? "bg-jade-100 text-jade-600"
                    : "bg-paper text-muted"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {i + 1}
            </span>
            <span
              className={`${
                active ? "text-ink" : done ? "text-ink-soft" : "text-muted"
              }`}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <span
                className="mx-1 h-px w-6 bg-line sm:w-10"
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

type StepContactProps = {
  buyer: BuyerForm;
  setBuyer: (patch: Partial<BuyerForm>) => void;
  errors: Record<string, string>;
};

function StepContact({ buyer, setBuyer, errors }: StepContactProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-ink">Datos de contacto</h2>
      <Field
        id="buyer-name"
        label="Nombre completo"
        value={buyer.name}
        onChange={(v) => setBuyer({ name: v })}
        error={errors["buyer.name"]}
        required
      />
      <Field
        id="buyer-email"
        label="Email"
        type="email"
        value={buyer.email}
        onChange={(v) => setBuyer({ email: v })}
        error={errors["buyer.email"]}
        required
      />
      <Field
        id="buyer-phone"
        label="Teléfono"
        type="tel"
        value={buyer.phone}
        onChange={(v) => setBuyer({ phone: v })}
        error={errors["buyer.phone"]}
        required
      />
    </div>
  );
}

type StepFulfillmentProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  setRecipient: (patch: Partial<RecipientForm>) => void;
  shippingRates: ShippingRate[];
  storeAddress: string | null;
  currency: string;
  selectedRate: ShippingRate | null;
  errors: Record<string, string>;
};

function StepFulfillment({
  form,
  setForm,
  setRecipient,
  shippingRates,
  storeAddress,
  currency,
  selectedRate,
  errors,
}: StepFulfillmentProps) {
  const isPickup = form.fulfillment === "pickup";
  const noRates = shippingRates.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-ink">¿Cómo lo querés recibir?</h2>

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Método de entrega</legend>
        <label
          className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 ${
            isPickup
              ? "border-brand-400 bg-brand-50"
              : "border-line bg-paper hover:border-brand-200"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="radio"
              name="fulfillment"
              value="pickup"
              checked={isPickup}
              onChange={() =>
                setForm((f) => ({ ...f, fulfillment: "pickup" }))
              }
              className="accent-brand-500"
            />
            Retirar en el local
          </span>
          <span className="text-xs text-ink-soft">
            Sin costo de envío. Coordinamos la fecha.
          </span>
        </label>
        <label
          className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 ${
            !isPickup
              ? "border-brand-400 bg-brand-50"
              : "border-line bg-paper hover:border-brand-200"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="radio"
              name="fulfillment"
              value="delivery"
              checked={!isPickup}
              onChange={() =>
                setForm((f) => ({ ...f, fulfillment: "delivery" }))
              }
              className="accent-brand-500"
            />
            Envío a domicilio
          </span>
          <span className="text-xs text-ink-soft">
            El costo depende de la provincia.
          </span>
        </label>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="recipient-name"
          label={isPickup ? "Quien retira" : "Quien recibe"}
          value={form.recipient.name}
          onChange={(v) => setRecipient({ name: v })}
          error={errors["recipient.name"]}
          required
        />
        <Field
          id="recipient-phone"
          label="Teléfono"
          type="tel"
          value={form.recipient.phone}
          onChange={(v) => setRecipient({ phone: v })}
          error={errors["recipient.phone"]}
          required
        />
      </div>

      {isPickup ? (
        <div className="rounded-xl border border-jade-100 bg-jade-100/40 p-4 text-sm text-ink-soft">
          {storeAddress ? (
            <>
              <span className="font-semibold text-ink">Retirás en: </span>
              {storeAddress}
            </>
          ) : (
            "Coordinamos el retiro por WhatsApp."
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {noRates ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-ink">
              No hay tarifas de envío configuradas para {currency}. Probá con
              retiro en el local.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="recipient-province"
                className="text-sm font-medium text-ink-soft"
              >
                Provincia <span className="text-brand-600">*</span>
              </label>
              <select
                id="recipient-province"
                value={form.recipient.province}
                onChange={(e) => setRecipient({ province: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none"
              >
                <option value="">Elegí provincia</option>
                {shippingRates.map((r) => (
                  <option key={r.province} value={r.province}>
                    {r.province} — {money(r.amountMinor, r.currency)}
                  </option>
                ))}
              </select>
              {errors["recipient.province"] && (
                <span className="text-xs font-medium text-brand-700">
                  {errors["recipient.province"]}
                </span>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="recipient-municipality"
              label="Municipio"
              value={form.recipient.municipality}
              onChange={(v) => setRecipient({ municipality: v })}
              error={errors["recipient.municipality"]}
              required
            />
            <Field
              id="recipient-address"
              label="Dirección"
              value={form.recipient.addressLine}
              onChange={(v) => setRecipient({ addressLine: v })}
              error={errors["recipient.addressLine"]}
              required
            />
          </div>
          <Field
            id="recipient-reference"
            label="Referencia (opcional)"
            value={form.recipient.reference}
            onChange={(v) => setRecipient({ reference: v })}
          />

          {selectedRate && (
            <div className="rounded-xl border border-line bg-paper p-4 text-sm text-ink-soft">
              <span className="font-semibold text-ink">Costo de envío: </span>
              {money(selectedRate.amountMinor, selectedRate.currency)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type StepPaymentProps = {
  currency: string;
  method: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
};

function StepPayment({ currency, method, onChange }: StepPaymentProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-ink">Método de pago</h2>
      <p className="text-sm text-ink-soft">
        No pagás online; te contactaremos para completar el pago.
      </p>

      {currency === "USD" ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-ink">
          <span className="font-semibold">Zelle</span>
          <p className="mt-1 text-xs text-ink-soft">
            Al confirmar te compartimos los datos por WhatsApp o correo.
          </p>
        </div>
      ) : (
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Método</legend>
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 ${
              method === "transfer_local"
                ? "border-brand-400 bg-brand-50"
                : "border-line bg-paper hover:border-brand-200"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="radio"
                name="payment"
                value="transfer_local"
                checked={method === "transfer_local"}
                onChange={() => onChange("transfer_local")}
                className="accent-brand-500"
              />
              Transferencia local
            </span>
            <span className="text-xs text-ink-soft">Transfermóvil / EnZona</span>
          </label>
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 ${
              method === "cod"
                ? "border-brand-400 bg-brand-50"
                : "border-line bg-paper hover:border-brand-200"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="radio"
                name="payment"
                value="cod"
                checked={method === "cod"}
                onChange={() => onChange("cod")}
                className="accent-brand-500"
              />
              Contra entrega
            </span>
            <span className="text-xs text-ink-soft">
              Pagás cuando recibís el pedido.
            </span>
          </label>
        </fieldset>
      )}
    </div>
  );
}

type StepReviewProps = {
  form: FormState;
  paymentMethod: PaymentMethod;
  lines: CartLine[];
  currency: SupportedCurrency;
  subtotal: number;
  shippingCost: number;
  estimatedTotal: number;
  selectedRate: ShippingRate | null;
  storeAddress: string | null;
  unavailableCount: number;
  submitError: string | null;
};

function StepReview({
  form,
  paymentMethod,
  lines,
  currency,
  subtotal,
  shippingCost,
  estimatedTotal,
  selectedRate,
  storeAddress,
  unavailableCount,
  submitError,
}: StepReviewProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-ink">Revisá tu pedido</h2>

      {unavailableCount > 0 && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-ink">
          Quitá los productos no disponibles en {currency} antes de confirmar.
        </div>
      )}

      <section className="rounded-xl border border-line bg-paper p-4 text-sm">
        <h3 className="text-sm font-bold text-ink">Contacto</h3>
        <p className="mt-1 text-ink-soft">
          {form.buyer.name} · {form.buyer.email} · {form.buyer.phone}
        </p>
      </section>

      <section className="rounded-xl border border-line bg-paper p-4 text-sm">
        <h3 className="text-sm font-bold text-ink">Entrega</h3>
        <p className="mt-1 text-ink-soft">
          {form.fulfillment === "pickup" ? "Retiro en el local" : "Envío a domicilio"}
        </p>
        <p className="mt-1 text-ink-soft">
          Recibe: {form.recipient.name} — {form.recipient.phone}
        </p>
        {form.fulfillment === "pickup" && storeAddress && (
          <p className="mt-1 text-ink-soft">Dirección: {storeAddress}</p>
        )}
        {form.fulfillment === "delivery" && (
          <p className="mt-1 text-ink-soft">
            {form.recipient.addressLine}, {form.recipient.municipality},{" "}
            {form.recipient.province}
            {form.recipient.reference ? ` (${form.recipient.reference})` : ""}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-paper p-4 text-sm">
        <h3 className="text-sm font-bold text-ink">Pago</h3>
        <p className="mt-1 text-ink-soft">{paymentLabel(paymentMethod)}</p>
      </section>

      <section className="rounded-xl border border-line bg-paper p-4">
        <h3 className="text-sm font-bold text-ink">Productos</h3>
        <ul className="mt-2 divide-y divide-line">
          {lines.map((l) => {
            const price = l.priceByCurrency[currency];
            const available = typeof price === "number";
            return (
              <li
                key={l.productId}
                className="flex items-start justify-between gap-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{l.name}</p>
                  <p className="text-xs text-ink-soft">
                    {available
                      ? `${money(price as number, currency)} × ${l.quantity}`
                      : `No disponible en ${currency}`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-ink">
                  {available ? money((price as number) * l.quantity, currency) : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 text-sm">
        <dl className="space-y-1">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="font-semibold text-ink">
              {money(subtotal, currency)}
            </dd>
          </div>
          {form.fulfillment === "delivery" && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">
                Envío{selectedRate ? ` (${selectedRate.province})` : ""}
              </dt>
              <dd className="font-semibold text-ink">
                {money(shippingCost, currency)}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <dt className="font-bold text-ink">Total estimado</dt>
            <dd className="font-extrabold text-ink">
              {money(estimatedTotal, currency)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">
          El total definitivo lo calcula el sistema al confirmar.
        </p>
      </section>

      {submitError && (
        <div
          role="alert"
          className="rounded-xl border border-brand-300 bg-brand-50 p-4 text-sm font-medium text-brand-700"
        >
          {submitError}
        </div>
      )}
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  type?: "text" | "email" | "tel";
};

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required,
  type = "text",
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-ink-soft">
        {label} {required && <span className="text-brand-600">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? "true" : undefined}
        className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink focus:outline-none ${
          error
            ? "border-brand-400 focus:border-brand-500"
            : "border-line focus:border-brand-400"
        }`}
      />
      {error && (
        <span className="text-xs font-medium text-brand-700">{error}</span>
      )}
    </div>
  );
}

function SuccessPanel({ order }: { order: SuccessOrder }) {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-jade-100 bg-surface px-6 py-12 text-center shadow-sm">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-jade-100 text-jade-600">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12l4 4L19 6" />
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          ¡Pedido recibido!
        </h1>

        <p className="text-sm text-ink-soft">
          Guardá tu número de pedido para consultas.
        </p>

        <p
          className="rounded-xl bg-paper px-6 py-3 font-mono text-xl font-bold tracking-wider text-ink sm:text-2xl"
          aria-label="Número de pedido"
        >
          {order.orderNumber}
        </p>

        <p className="max-w-md text-sm text-ink-soft">
          No pagás online; te contactaremos para completar el pago por{" "}
          <span className="font-semibold text-ink">
            {paymentLabel(order.paymentMethod)}
          </span>
          .
        </p>

        <p className="text-base font-bold text-ink">
          Total: {money(order.totalMinor, order.currency)}
        </p>

        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <a
            href={`/api/v1/receipt/${order.receiptToken}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            Ver recibo
          </a>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-6 py-2.5 text-sm font-semibold text-ink hover:border-brand-300 hover:text-brand-700"
          >
            Seguir comprando
          </a>
        </div>
      </div>
    </section>
  );
}

/** Traduce el `code` del backend a un mensaje amable para el shopper. */
function messageForCode(code: string | undefined): string {
  switch (code) {
    case "INSUFFICIENT_STOCK":
      return "Un producto se quedó sin stock, revisá tu carrito.";
    case "SHIPPING_NOT_SUPPORTED":
      return "No hay envío a esa provincia.";
    default:
      return "No pudimos crear el pedido, revisá los datos.";
  }
}
