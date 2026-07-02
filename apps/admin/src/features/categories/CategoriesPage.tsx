import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryDialog } from "./CategoryDialog";
import { useCategories, useDeleteCategory } from "./hooks";
import { buildTree, type CategoryNode } from "./tree";
import type { Category } from "./types";

/** Estado del diálogo: cerrado, crear (con padre opcional) o editar. */
type DialogState =
  | { mode: "closed" }
  | { mode: "create"; parentId: string | null }
  | { mode: "edit"; category: Category };

export function CategoriesPage() {
  const { data, isPending, isError, error, refetch } = useCategories();
  const del = useDeleteCategory();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });

  const categories = data ?? [];
  const tree = buildTree(categories);

  // Key del diálogo: cambia entre crear/editar y por categoría editada, para
  // re-montarlo con el estado inicial correcto (los useState se siembran al montar).
  const dialogKey =
    dialog.mode === "edit"
      ? `edit-${dialog.category.id}`
      : dialog.mode === "create"
        ? `create-${dialog.parentId ?? "root"}`
        : "closed";

  function renderNode(node: CategoryNode, depth: number) {
    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 border-b py-2 last:border-0"
          style={{ paddingLeft: `${depth * 1.5}rem` }}
        >
          <span className="font-medium">{node.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{node.slug}</span>
          <div className="ml-auto flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Editar ${node.name}`}
              onClick={() => setDialog({ mode: "edit", category: node })}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Agregar subcategoría a ${node.name}`}
              onClick={() => setDialog({ mode: "create", parentId: node.id })}
            >
              <Plus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Borrar ${node.name}`}
              onClick={() => {
                if (confirm(`¿Borrar "${node.name}"? Se quitará de los productos vinculados.`)) {
                  del.mutate(node.id, {
                    onError: () => toast.error("No se pudo borrar la categoría"),
                  });
                }
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categorías"
        subtitle="Catálogo · jerarquía"
        actions={
          <Button onClick={() => setDialog({ mode: "create", parentId: null })}>
            Nueva categoría
          </Button>
        }
      />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : tree.length === 0 ? (
        <EmptyState message="No hay categorías" />
      ) : (
        <Card className="px-4 py-1">{tree.map((n) => renderNode(n, 0))}</Card>
      )}

      <CategoryDialog
        key={dialogKey}
        open={dialog.mode !== "closed"}
        onOpenChange={(o) => !o && setDialog({ mode: "closed" })}
        categories={categories}
        category={dialog.mode === "edit" ? dialog.category : undefined}
        defaultParentId={dialog.mode === "create" ? dialog.parentId : undefined}
      />
    </div>
  );
}
