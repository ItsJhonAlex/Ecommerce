import { Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useSettings, useUpdateSettings } from "./hooks";

// Estado del form: strings planas (los null del server se muestran como "").
type FormState = {
  businessName: string;
  phone: string;
  address: string;
  email: string;
  receiptNote: string;
  notifyPhones: string[];
  notifySmsEnabled: boolean;
};

const EMPTY_FORM: FormState = {
  businessName: "",
  phone: "",
  address: "",
  email: "",
  receiptNote: "",
  notifyPhones: [],
  notifySmsEnabled: false,
};

// Formato de número cubano para SMS: +53 seguido de 8 dígitos.
const PHONE_RE = /^\+53\d{8}$/;

/** Página "Negocio": datos que aparecen en el recibo. */
export function SettingsPage() {
  const { data, isPending, isError, error, refetch } = useSettings();
  const update = useUpdateSettings();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // Estado local del editor de números: input + error inline de validación.
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Inicializar el form desde los ajustes cargados (null → "").
  useEffect(() => {
    if (data) {
      setForm({
        businessName: data.businessName ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
        email: data.email ?? "",
        receiptNote: data.receiptNote ?? "",
        notifyPhones: data.notifyPhones ?? [],
        notifySmsEnabled: data.notifySmsEnabled ?? false,
      });
    }
  }, [data]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Agrega el número del input al array del form si pasa la validación de formato.
  function addPhone() {
    const value = phoneInput.trim();
    if (!PHONE_RE.test(value)) {
      setPhoneError("Formato inválido. Usá +53 y 8 dígitos (ej: +5351234567).");
      return;
    }
    setPhoneError(null);
    setForm((f) =>
      f.notifyPhones.includes(value)
        ? f
        : { ...f, notifyPhones: [...f.notifyPhones, value] },
    );
    setPhoneInput("");
  }

  function removePhone(phone: string) {
    setForm((f) => ({
      ...f,
      notifyPhones: f.notifyPhones.filter((p) => p !== phone),
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    update.mutate(form, {
      onSuccess: () => toast.success("Ajustes guardados"),
      onError: (err: unknown) =>
        toast.error(
          err instanceof ApiError ? err.message : "No se pudieron guardar",
        ),
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Negocio" subtitle="Datos que aparecen en el recibo" />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-businessName">Nombre del negocio</Label>
                <Input
                  id="s-businessName"
                  required
                  value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-phone">Teléfono</Label>
                <Input
                  id="s-phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-address">Dirección</Label>
                <Input
                  id="s-address"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-email">Email</Label>
                <Input
                  id="s-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-receiptNote">Nota del recibo</Label>
                <Textarea
                  id="s-receiptNote"
                  value={form.receiptNote}
                  onChange={(e) => set("receiptNote", e.target.value)}
                />
              </div>

              {/* Sección Notificaciones: aviso por SMS de pedidos nuevos. */}
              <div className="space-y-3 border-t pt-4">
                <h2 className="text-sm font-medium">Notificaciones</h2>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.notifySmsEnabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        notifySmsEnabled: e.target.checked,
                      }))
                    }
                  />
                  Avisar por SMS cuando entra un pedido
                </label>

                {form.notifyPhones.length > 0 && (
                  <ul className="space-y-2">
                    {form.notifyPhones.map((phone) => (
                      <li
                        key={phone}
                        className="flex items-center gap-3 rounded-md border p-2"
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-sm">
                          {phone}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Quitar ${phone}`}
                          onClick={() => removePhone(phone)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="s-notifyPhone">Agregar número</Label>
                    <Input
                      id="s-notifyPhone"
                      placeholder="+5351234567"
                      value={phoneInput}
                      onChange={(e) => {
                        setPhoneInput(e.target.value);
                        if (phoneError) setPhoneError(null);
                      }}
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={addPhone}>
                    Agregar
                  </Button>
                </div>
                {phoneError && (
                  <p className="text-sm text-destructive" role="alert">
                    {phoneError}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
