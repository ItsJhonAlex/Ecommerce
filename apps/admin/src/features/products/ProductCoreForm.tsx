import { PRODUCT_STATUSES } from "@avanzar/shared";
import { type FormEvent, useState } from "react";
import { filterSelectClass } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productStatusLabel } from "@/lib/format";
import { slugify } from "@/lib/slug";
import type { ProductStatus } from "./types";

export type CoreValues = {
  name: string;
  slug: string;
  description: string;
  status: ProductStatus;
  stockQuantity: number;
};

/** Sanitiza la entrada manual de slug sin romper el tipeo (conserva guiones). */
function sanitizeSlug(v: string): string {
  return v
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

type Props = {
  initial?: Partial<CoreValues>;
  submitLabel: string;
  pending: boolean;
  error?: string | null;
  onSubmit: (values: CoreValues) => void;
};

/** Form de campos núcleo del producto (reusado en alta y edición). */
export function ProductCoreForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(initial?.slug));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<string>(initial?.status ?? "draft");
  const [stock, setStock] = useState(String(initial?.stockQuantity ?? 0));

  function onNameChange(v: string) {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  function onSlugChange(v: string) {
    const clean = sanitizeSlug(v);
    setSlug(clean);
    // Solo se "congela" la auto-derivación si quedó algo; al vaciarlo, vuelve.
    setSlugEdited(clean.length > 0);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      slug,
      description,
      status: status as ProductStatus,
      stockQuantity: Number(stock) || 0,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            className="font-mono"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <textarea
          id="description"
          className="min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            className={`${filterSelectClass} w-full`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {productStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            type="number"
            min={0}
            step={1}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
