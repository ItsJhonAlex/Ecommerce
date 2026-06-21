/**
 * La lógica de transiciones vive en @avanzar/shared (única fuente de verdad,
 * compartida con el panel admin). Este módulo re-exporta para preservar el
 * import path histórico del backend.
 */
export {
  ALLOWED_TRANSITIONS,
  canTransition,
  type OrderStatus,
} from "@avanzar/shared";
