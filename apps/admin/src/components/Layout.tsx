import { Banknote, Boxes, LogOut, Package } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/orders", label: "Pedidos", icon: Package },
  { to: "/payments", label: "Pagos", icon: Banknote },
  { to: "/products", label: "Productos", icon: Boxes },
];

/** Shell autenticado: sidebar de navegación + sesión + tema. */
export function Layout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="grid size-8 place-items-center rounded-lg bg-primary font-display text-base font-extrabold text-primary-foreground">
            A
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold tracking-tight">
              Avanzar
            </p>
            <p className="text-xs text-muted-foreground">Consola admin</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t p-3">
          <p
            className="truncate px-2 text-xs text-muted-foreground"
            title={session?.user.email}
          >
            {session?.user.email}
          </p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              Salir
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto px-8 py-7">
        <Outlet />
      </main>
    </div>
  );
}
