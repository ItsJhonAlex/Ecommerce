/**
 * La lógica de transiciones vive en @avanzar/shared (única fuente de verdad,
 * compartida con el panel admin). Este módulo re-exporta para preservar el
 * import path histórico del backend.
 */
export {
  allowedTransitions,
  canTransition,
  type FulfillmentMethod,
  type OrderStatus,
} from "@avanzar/shared";
