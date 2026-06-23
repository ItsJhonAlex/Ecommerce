import { isAdminRole } from "@avanzar/shared";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth";

/** Pantalla de login. Solo admins pueden entrar al panel. */
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // try/finally: el botón queda deshabilitado durante TODO el flujo, incluido
    // el signOut() del path no-admin (evita un reenvío mientras está en vuelo).
    try {
      const { data, error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError || !data) {
        setError(signInError?.message ?? "No se pudo iniciar sesión");
        return;
      }
      // `inferAdditionalFields` adds `role` at runtime; narrow via cast.
      const role = (data.user as { role?: string }).role;
      if (!isAdminRole(role)) {
        await authClient.signOut();
        setError("No tenés permisos para acceder al panel");
        return;
      }
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="grid size-11 place-items-center rounded-xl bg-primary font-display text-xl font-extrabold text-primary-foreground">
            A
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">
              Avanzar · Admin
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Consola de operaciones
            </p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vos@avanzar.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
