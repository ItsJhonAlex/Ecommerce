// @vitest-environment node
// El compilador de Astro (esbuild) rompe bajo jsdom; este test SSR no necesita
// DOM, así que corre en el entorno `node` (igual que ProductCard.test.ts).
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import CatalogControls from "./CatalogControls.astro";

async function render(
  props: Record<string, unknown> = {},
): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(CatalogControls, {
    props: { currency: "USD", ...props },
  });
}

describe("CatalogControls", () => {
  it("marca como seleccionada la opción de orden actual", async () => {
    const html = await render({ sort: "price_asc" });
    expect(html).toMatch(/<option[^>]*value="price_asc"[^>]*selected/);
    // La opción por defecto no debe quedar seleccionada.
    expect(html).not.toMatch(/<option[^>]*value="newest"[^>]*selected/);
  });

  it("es un form GET que apunta a /productos", async () => {
    const html = await render();
    expect(html).toMatch(/<form[^>]*method="get"/);
    expect(html).toMatch(/action="\/productos"/);
  });

  it("preserva q y category como inputs hidden", async () => {
    const html = await render({ q: "remera", category: "ropa" });
    expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="q"[^>]*value="remera"/);
    expect(html).toMatch(
      /<input[^>]*type="hidden"[^>]*name="category"[^>]*value="ropa"/,
    );
  });

  it('muestra "Limpiar" solo cuando hay filtros activos', async () => {
    const sinFiltros = await render();
    expect(sinFiltros).not.toContain("Limpiar");

    const conFiltros = await render({ minPrice: "10" });
    expect(conFiltros).toContain("Limpiar");
  });

  it("rotula los inputs de precio con la moneda activa", async () => {
    const html = await render({ currency: "CUP" });
    expect(html).toContain("Precio mín. (CUP)");
    expect(html).toContain("Precio máx. (CUP)");
  });
});
