import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

/** QueryClient sin reintentos para tests deterministas. */
function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/** Renderiza `ui` en una ruta `path`, dentro de QueryClient + router en memoria. */
export function renderWithProviders(
  ui: ReactElement,
  opts: { path?: string; initialEntries?: string[] } = {},
) {
  const path = opts.path ?? "/";
  const router = createMemoryRouter([{ path, element: ui }], {
    initialEntries: opts.initialEntries ?? [path],
  });
  const client = testQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
