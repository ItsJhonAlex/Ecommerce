import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Alineación de la celda. Usar "right" para columnas numéricas. */
  align?: "left" | "right";
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
};

/** Tabla genérica controlada por `columns` y `rows`, dentro de un card. */
export function DataTable<T>({ columns, rows, rowKey, onRowClick }: Props<T>) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
            {columns.map((c) => (
              <TableHead
                key={c.key}
                className={cn(
                  "h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                  c.align === "right" && "text-right",
                )}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-border/60 transition-colors",
                onRowClick && "cursor-pointer hover:bg-accent/50",
              )}
            >
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={cn("py-3", c.align === "right" && "text-right")}
                >
                  {c.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
