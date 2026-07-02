import { type FormEvent, useState } from "react";
import { filterSelectClass } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { slugify } from "@/lib/slug";
import { useCreateCategory, useUpdateCategory } from "./hooks";
import { descendantIds } from "./tree";
import type { Category } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  category?: Category;
  defaultParentId?: string | null;
};

/** Diálogo para crear o editar una categoría (con selector de padre sin ciclos). */
export function CategoryDialog({
  open,
  onOpenChange,
  categories,
  category,
  defaultParentId,
}: Props) {
  const editing = Boolean(category);
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(category?.slug));
  const [parentId, setParentId] = useState<string>(
    category?.parentId ?? defaultParentId ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  const create = useCreateCategory();
  const update = useUpdateCategory(category?.id ?? "");
  const pending = create.isPending || update.isPending;

  const excluded = category ? descendantIds(categories, category.id) : new Set<string>();
  const parentOptions = categories.filter((c) => !excluded.has(c.id));

  function onNameChange(v: string) {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const body = { name, slug, parentId: parentId || null };
    const onError = (err: unknown) =>
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    const onSuccess = () => onOpenChange(false);
    if (editing) {
      update.mutate(body, { onSuccess, onError });
    } else {
      create.mutate(body, { onSuccess, onError });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Nombre</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-slug">Slug</Label>
            <Input
              id="cat-slug"
              className="font-mono"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-parent">Categoría padre</Label>
            <select
              id="cat-parent"
              className={`${filterSelectClass} w-full`}
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">— Sin padre —</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : editing ? "Guardar" : "Crear"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
