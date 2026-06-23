export type Theme = "light" | "dark";

const KEY = "avanzar-theme";

/** Tema guardado por el usuario, o null si nunca eligió. */
export function getStoredTheme(): Theme | null {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : null;
}

/** Tema efectivo: el elegido, o la preferencia del sistema. */
export function resolveTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Aplica el tema agregando/quitando la clase `dark` en <html>. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Persiste y aplica el tema. */
export function setTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}
