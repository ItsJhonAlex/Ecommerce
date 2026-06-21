import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

/** True si el error es 401 (sesión ausente/expirada) o 403 (sin permiso): en
 * ambos casos la sesión actual no sirve para el panel → volver a login. */
export function isUnauthorized(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

/**
 * QueryClient con manejo global: ante un 401 en cualquier query/mutación,
 * dispara `onUnauthorized` (limpieza de sesión + redirect a login). Las queries
 * no reintentan errores 4xx.
 */
export function createQueryClient(onUnauthorized: () => void): QueryClient {
  const handle = (error: unknown) => {
    if (isUnauthorized(error)) onUnauthorized();
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError: handle }),
    mutationCache: new MutationCache({ onError: handle }),
    defaultOptions: {
      queries: {
        retry: (count, error) =>
          !(error instanceof ApiError && error.status < 500) && count < 2,
        staleTime: 10_000,
      },
      mutations: { retry: false },
    },
  });
}
