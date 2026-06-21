import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { createQueryClient } from "@/lib/queryClient";
import { router } from "@/routes";

// 401 global: limpia y manda a login (window.location para escapar del router
// fuera de contexto de componente).
const queryClient = createQueryClient(() => {
  queryClient.clear();
  window.location.href = "/login";
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
