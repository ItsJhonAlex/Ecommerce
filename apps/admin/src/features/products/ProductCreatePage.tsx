import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { useCreateProduct } from "./hooks";
import { type CoreValues, ProductCoreForm } from "./ProductCoreForm";

/** Alta de producto: campos núcleo → crea y navega al editor. */
export function ProductCreatePage() {
  const navigate = useNavigate();
  const create = useCreateProduct();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(values: CoreValues) {
    setError(null);
    create.mutate(
      {
        slug: values.slug,
        name: values.name,
        description: values.description || null,
        status: values.status,
        stockQuantity: values.stockQuantity,
      },
      {
        onSuccess: (product) => navigate(`/products/${product.id}`),
        onError: (e) =>
          setError(
            e instanceof ApiError ? e.message : "No se pudo crear el producto",
          ),
      },
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Productos
      </Link>
      <h2 className="font-display text-2xl font-bold tracking-tight">
        Nuevo producto
      </h2>
      <Card className="p-6">
        <ProductCoreForm
          submitLabel="Crear producto"
          pending={create.isPending}
          error={error}
          onSubmit={handleSubmit}
        />
      </Card>
    </div>
  );
}
