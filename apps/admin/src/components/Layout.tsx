import { NavLink, Outlet, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth";

const NAV = [
  { to: "/orders", label: "Pedidos" },
  { to: "/payments", label: "Pagos" },
];

/** Shell autenticado: sidebar de navegación + header con sesión. */
export function Layout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r p-4">
        <h1 className="mb-6 font-semibold">Avanzar · Admin</h1>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm ${
                  isActive ? "bg-muted font-medium" : "text-muted-foreground"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <span className="text-sm text-muted-foreground">
            {session?.user.email}
          </span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Salir
          </Button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
