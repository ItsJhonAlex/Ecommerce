// @vitest-environment node
// SSR sin DOM: entorno `node` (igual que ProductCard.test.ts).
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Pagination from "./Pagination.astro";

async function render(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Pagination, { props });
}

describe("Pagination", () => {
  it("no renderiza nada cuando total <= pageSize", async () => {
    const html = await render({ total: 10, page: 1, pageSize: 24 });
    expect(html.trim()).not.toContain("Siguiente");
    expect(html.trim()).not.toContain("Anterior");
  });

  it('muestra "Siguiente" habilitado cuando hay más páginas', async () => {
    const html = await render({ total: 50, page: 1, pageSize: 24 });
    expect(html).toContain("Siguiente");
    // "Siguiente" es un link (hay página siguiente).
    expect(html).toMatch(/<a[^>]*href="[^"]*page=2"[^>]*>\s*Siguiente/);
    // En la primera página "Anterior" queda deshabilitado (no es link).
    expect(html).toMatch(/<span[^>]*aria-disabled="true"[^>]*>\s*Anterior/);
  });

  it("preserva los demás params en los links de página", async () => {
    const html = await render({
      total: 50,
      page: 1,
      pageSize: 24,
      params: { sort: "price_asc", q: "remera", minPrice: "10" },
    });
    expect(html).toMatch(/href="[^"]*sort=price_asc[^"]*"/);
    expect(html).toMatch(/href="[^"]*q=remera[^"]*"/);
    expect(html).toMatch(/href="[^"]*minPrice=10[^"]*"/);
  });

  it("marca la página actual con aria-current", async () => {
    const html = await render({ total: 50, page: 2, pageSize: 24 });
    expect(html).toMatch(/aria-current="page"[^>]*>\s*2/);
  });
});
