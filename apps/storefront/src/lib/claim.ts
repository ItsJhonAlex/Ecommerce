/**
 * Puente de estado entre el checkout de invitado (S2) y el login/registro
 * posterior (S3): si el cliente compra sin sesión, guardamos el `receiptToken`
 * acá; al loguearse/registrarse, `AuthForm` lo reclama automáticamente.
 */
const PENDING_CLAIM_KEY = "avanzar_pending_claim";

export function setPendingClaimToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_CLAIM_KEY, token);
}

export function getPendingClaimToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PENDING_CLAIM_KEY);
}

export function clearPendingClaimToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_CLAIM_KEY);
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Extrae un token de seguimiento/recibo de lo que el cliente pegue: un uuid
 * pelado, o una URL que termine (o contenga) el uuid. `null` si no matchea.
 */
export function extractToken(input: string): string | null {
  const match = input.trim().match(UUID_RE);
  return match ? match[0] : null;
}
