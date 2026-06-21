import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "@/test/utils";
import { DataTable } from "./DataTable";

type Row = { id: string; name: string };
const rows: Row[] = [
  { id: "1", name: "Ana" },
  { id: "2", name: "Beto" },
];
const columns = [{ key: "name", header: "Nombre", render: (r: Row) => r.name }];

describe("DataTable", () => {
  test("renderiza headers y filas", () => {
    renderWithProviders(
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />,
    );
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Beto")).toBeInTheDocument();
  });

  test("dispara onRowClick con la fila", async () => {
    const onRowClick = vi.fn();
    renderWithProviders(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );
    await userEvent.click(screen.getByText("Beto"));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });
});
