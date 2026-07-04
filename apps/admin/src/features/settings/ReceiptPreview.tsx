import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Campos del negocio que se reflejan en el recibo. */
type ReceiptValues = {
  businessName: string;
  phone: string;
  address: string;
  email: string;
  receiptNote: string;
};

/**
 * Vista previa en vivo del recibo en PDF. Pide al backend el PDF renderizado con
 * un pedido de ejemplo + los valores actuales del form (sin necesidad de guardar).
 * Se refresca solo, con debounce, al cambiar cualquier campo.
 */
export function ReceiptPreview({ values }: { values: ReceiptValues }) {
  const [objUrl, setObjUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // URL actual en un ref para revocarla sin depender de closures viejos.
  const currentUrl = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Debounce: esperamos a que el usuario deje de tipear antes de re-renderizar.
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        // `fetch` directo (no `apiFetch`, que parsea JSON): necesitamos el blob.
        const res = await fetch("/api/v1/admin/settings/receipt-preview", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (cancelled) return;
        if (!res.ok) throw new Error("preview failed");
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        // Revocar la URL anterior antes de reemplazarla (evita fugas de memoria).
        if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = url;
        setObjUrl(url);
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Dependemos de los campos primitivos (no del objeto `values`, que el padre
    // recrea en cada render): así solo re-generamos cuando cambia un dato del recibo,
    // no al editar otras partes del form (ej. números de notificación).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    values.businessName,
    values.phone,
    values.address,
    values.email,
    values.receiptNote,
  ]);

  // Revocar la última URL al desmontar.
  useEffect(() => {
    return () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    };
  }, []);

  return (
    <div className="lg:sticky lg:top-6">
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        Vista previa del recibo
      </p>
      <div className="relative aspect-[1/1.414] w-full overflow-hidden rounded-xl border bg-muted/30 shadow-sm">
        {objUrl ? (
          <iframe
            title="Vista previa del recibo"
            src={objUrl}
            className="h-full w-full border-0 bg-white"
          />
        ) : null}

        {/* Skeleton/spinner mientras se genera el PDF por primera vez. */}
        {loading && !objUrl ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground"
            aria-busy="true"
          >
            <Loader2 className="size-6 animate-spin" />
            <span className="text-sm">Generando vista previa…</span>
          </div>
        ) : null}

        {/* Estado de error. */}
        {error ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-card/80 p-4 text-center"
            role="alert"
          >
            <p className="text-sm text-destructive">
              No se pudo generar la vista previa
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
