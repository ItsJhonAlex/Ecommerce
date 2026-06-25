import { X } from "lucide-react";
import { useState } from "react";
import { filterSelectClass } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useCategories, useLinkCategory, useUnlinkCategory } from "./hooks";
import type { ProductCategoryLink } from "./types";

/** Editor de categorías vinculadas a un producto. */
export function CategoriesEditor({
  productId,
  linked,
}: {
  productId: string;
  linked: ProductCategoryLink[];
}) {
  const { data: categories } = useCategories();
  const link = useLinkCategory(productId);
  const unlink = useUnlinkCategory(productId);
  const [selected, setSelected] = useState("");

  const linkedIds = new Set(linked.map((l) => l.category.id));
  const available = (categories ?? []).filter((c) => !linkedIds.has(c.id));

  if (!categories) {
    return <p className="text-sm text-muted-foreground">Cargando categorías…</p>;
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay categorías. Se crean en Configuración (V2b).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {linked.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {linked.map((l) => (
            <li key={l.category.id}>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                {l.category.name}
                <button
                  type="button"
                  aria-label={`Quitar ${l.category.name}`}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => unlink.mutate(l.category.id)}
                >
                  <X className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <select
          aria-label="Agregar categoría"
          className={filterSelectClass}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Elegí una categoría…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          disabled={!selected || link.isPending}
          onClick={() => {
            if (selected) {
              link.mutate(selected, { onSuccess: () => setSelected("") });
            }
          }}
        >
          Vincular
        </Button>
      </div>
    </div>
  );
}
