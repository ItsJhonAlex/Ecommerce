import { isAdminRole } from "@avanzar/shared";
import { Navigate, Outlet } from "react-router";
import { LoadingState } from "@/components/states";
import { authClient } from "@/lib/auth";

/** Protege el árbol autenticado: solo sesión con rol admin/staff. */
export function RequireAdmin() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <LoadingState />;
  if (!session || !isAdminRole(session.user.role)) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
