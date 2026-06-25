import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, LoadingState } from "@/components/states";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { CategoriesEditor } from "./CategoriesEditor";
import { useProduct, useUpdateProduct } from "./hooks";
import { ImagesEditor } from "./ImagesEditor";
import { PricesEditor } from "./PricesEditor";
import { type CoreValues, ProductCoreForm } from "./ProductCoreForm";

/** Sección con título display + contenido. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4 p-6">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {children}
    </Card>
  );
}

/** Editor de producto: núcleo + precios + imágenes + categorías. */
export function ProductEditorPage() {
  const { id } = useParams();
  const { data: product, isPending, isError, error, refetch } = useProduct(id);
  const update = useUpdateProduct(id ?? "");
  const [coreError, setCoreError] = useState<string | null>(null);

  if (isPending) return <LoadingState />;
  if (isError) {
    return (
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    );
  }

  function handleCore(values: CoreValues) {
    setCoreError(null);
    update.mutate(
      {
        slug: values.slug,
        name: values.name,
        description: values.description || null,
        status: values.status,
        stockQuantity: values.stockQuantity,
      },
      {
        onError: (e) =>
          setCoreError(
            e instanceof ApiError ? e.message : "No se pudo guardar",
          ),
      },
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-3">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Productos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {product.name}
          </h2>
          <StatusBadge kind="product" status={product.status} />
        </div>
      </div>

      <Section title="Datos">
        <ProductCoreForm
          key={product.id}
          initial={{
            name: product.name,
            slug: product.slug,
            description: product.description ?? "",
            status: product.status,
            stockQuantity: product.stockQuantity,
          }}
          submitLabel="Guardar cambios"
          pending={update.isPending}
          error={coreError}
          onSubmit={handleCore}
        />
      </Section>

      <Section title="Precios">
        <PricesEditor productId={product.id} prices={product.prices} />
      </Section>

      <Section title="Imágenes">
        <ImagesEditor productId={product.id} images={product.images} />
      </Section>

      <Section title="Categorías">
        <CategoriesEditor productId={product.id} linked={product.categories} />
      </Section>
    </div>
  );
}
