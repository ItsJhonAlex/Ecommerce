import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useAddImage, useDeleteImage, useReorderImages } from "./hooks";
import type { ProductImage } from "./types";

/** Editor de imágenes (por URL) de un producto, con reordenamiento ↑/↓. */
export function ImagesEditor({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const add = useAddImage(productId);
  const del = useDeleteImage(productId);
  const reorder = useReorderImages(productId);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sorted = [...images].sort((a, b) => a.position - b.position);

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    add.mutate(
      { url, alt: alt || undefined, position: images.length },
      {
        onSuccess: () => {
          setUrl("");
          setAlt("");
        },
        onError: (e2) =>
          setError(e2 instanceof ApiError ? e2.message : "No se pudo agregar"),
      },
    );
  }

  function swap(index: number, dir: -1 | 1) {
    const target = index + dir;
    const a = sorted[index];
    const b = sorted[target];
    if (!a || !b) return;
    // Intercambio con el vecino → nuevo orden de ids, una sola escritura atómica.
    const newIds = sorted.map((img) => img.id);
    newIds[index] = b.id;
    newIds[target] = a.id;
    reorder.mutate(newIds, {
      onError: () => toast.error("No se pudo reordenar"),
    });
  }

  return (
    <div className="space-y-3">
      {sorted.length > 0 && (
        <ul className="space-y-2">
          {sorted.map((img, i) => (
            <li
              key={img.id}
              className="flex items-center gap-3 rounded-md border p-2"
            >
              <img
                src={img.url}
                alt={img.alt ?? ""}
                className="size-12 rounded object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {img.alt || img.url}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Subir imagen"
                disabled={i === 0 || reorder.isPending}
                onClick={() => swap(i, -1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Bajar imagen"
                disabled={i === sorted.length - 1 || reorder.isPending}
                onClick={() => swap(i, 1)}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Borrar imagen"
                onClick={() =>
                  del.mutate(img.id, {
                    onError: () => toast.error("No se pudo borrar la imagen"),
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="alt">Alt</Label>
          <Input id="alt" value={alt} onChange={(e) => setAlt(e.target.value)} />
        </div>
        <Button type="submit" disabled={add.isPending}>
          Agregar imagen
        </Button>
      </form>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
