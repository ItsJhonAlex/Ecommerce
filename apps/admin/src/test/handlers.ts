import { type HttpHandler } from "msw";

/** Handlers por defecto. Cada test agrega/override con server.use(...). */
export const handlers: HttpHandler[] = [];
