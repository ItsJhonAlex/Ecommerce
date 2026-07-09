/// <reference types="astro/client" />

// `tsc` (a diferencia del editor con el plugin de Astro) no resuelve los
// imports de `.astro`. Esta declaración ambiente permite importar componentes
// Astro desde archivos `.ts` (p. ej. los tests con `astro/container`).
declare module "*.astro" {
  const Component: import("astro/runtime/server/index.js").AstroComponentFactory;
  export default Component;
}
