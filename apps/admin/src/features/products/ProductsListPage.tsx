import { PRODUCT_STATUSES } from "@avanzar/shared";
import { useState } from "react";
import { Link } from "react-router";
import type { Column } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { filterSelectClass, PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, productStatusLabel } from "@/lib/format";
import { useArchiveProduct, useProducts } from "./hooks";
import { StockCell } from "./StockCell";
import type { ProductListItem } from "./types";

function primaryPrice(p: ProductListItem): string {
  const first = p.prices[0];
  if (!first) return "—";
  const price = p.prices.find((pr) => pr.currency === "USD") ?? first;
  return money(price.amountMinor, price.currency);
}

/** Lista de productos con filtro, búsqueda y stock inline. */
export function ProductsListPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const archive = useArchiveProduct();
  const { data, isPending, isError, error, refetch } = useProducts({
    status: status || undefined,
    q: q || undefined,
  });

  const columns: Column<ProductListItem>[] = [
    {
      key: "name",
      header: "Producto",
      render: (p) => (
        <div className="flex flex-col">
          <span className="font-medium">{p.name}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {p.slug}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (p) => <StatusBadge kind="product" status={p.status} />,
    },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      render: (p) => <StockCell id={p.id} value={p.stockQuantity} />,
    },
    {
      key: "price",
      header: "Precio",
      align: "right",
      render: (p) => <span className="font-medium">{primaryPrice(p)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/products/${p.id}`}>Editar</Link>
          </Button>
          {p.status !== "archived" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`¿Archivar "${p.name}"? Dejará de venderse.`)) {
                  archive.mutate(p.id);
                }
              }}
            >
              Archivar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Productos"
        subtitle={
          data && !isPending
            ? `${data.length} ${data.length === 1 ? "producto" : "productos"}`
            : "Catálogo"
        }
        actions={
          <>
            <Input
              aria-label="Buscar"
              placeholder="Buscar…"
              className="h-9 w-44"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              aria-label="Estado"
              className={filterSelectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos</option>
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {productStatusLabel(s)}
                </option>
              ))}
            </select>
            <Button asChild>
              <Link to="/products/new">Nuevo producto</Link>
            </Button>
          </>
        }
      />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message={(error as Error).message}
          onRetry={() => refetch()}
        />
      ) : data.length === 0 ? (
        <EmptyState message="No hay productos" />
      ) : (
        <DataTable columns={columns} rows={data} rowKey={(p) => p.id} />
      )}
    </div>
  );
}
