import { authClient } from "../lib/auth";

/** Ícono de usuario (mismo trazo que el link "Cuenta" original del Header). */
function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

const linkClass =
  "hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-700 sm:inline-flex";

export default function AccountLink() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    // Estado neutro breve: mismo espacio reservado, sin texto, para no parpadear.
    return <span className={linkClass} aria-hidden="true" />;
  }

  if (!session?.user) {
    return (
      <a href="/login" className={linkClass}>
        <UserIcon />
        Ingresar
      </a>
    );
  }

  const label = session.user.name?.trim() || "Mis pedidos";

  return (
    <a href="/mis-pedidos" className={linkClass}>
      <UserIcon />
      {label}
    </a>
  );
}
