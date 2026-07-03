// Tipos de ajustes del negocio. Se re-exportan desde @avanzar/shared para no
// arrastrar @avanzar/db (postgres.js) al bundle del front.
export type { StoreSettings, StoreSettingsUpdate } from "@avanzar/shared";
