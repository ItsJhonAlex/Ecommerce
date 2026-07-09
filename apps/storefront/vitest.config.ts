/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// `getViteConfig` carga la config de Astro (integración React, Tailwind y el
// plugin que compila `.astro`), habilitando tests de componentes Astro vía
// `astro/container`. Los tests React siguen corriendo en jsdom; los tests SSR
// que rompen bajo jsdom fijan `// @vitest-environment node` por archivo.
// El `as` evita el chequeo de propiedad extra de `test` (la augmentación de
// vitest sobre `vite` no cruza por la resolución de módulos que hace Astro).
export default getViteConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
} as Parameters<typeof getViteConfig>[0]);
