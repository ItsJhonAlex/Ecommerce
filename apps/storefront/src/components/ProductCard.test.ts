// @vitest-environment node
// El compilador de Astro (esbuild) rompe bajo jsdom (invariante de TextEncoder);
// este test SSR no necesita DOM, así que corre en el entorno `node`.
import type { ProductListItem } from "@avanzar/shared";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import { money } from "../lib/money";
import ProductCard from "./ProductCard.astro";

const baseProduct: ProductListItem = {
  id: "p-1",
  slug: "remera-jade",
  name: "Remera Jade",
  priceMinor: 1999,
  currency: "USD",
  image: { url: "https://cdn.example.com/remera.jpg", alt: "Remera jade" },
  stockQuantity: 5,
};

async function render(product: ProductListItem): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ProductCard, { props: { product } });
}

describe("ProductCard", () => {
  it("muestra el nombre, el precio formateado y el link al detalle", async () => {
    const html = await render(baseProduct);

    expect(html).toContain("Remera Jade");
    expect(html).toContain(money(baseProduct.priceMinor, baseProduct.currency));
    expect(html).toContain('href="/producto/remera-jade"');
  });

  it('muestra "Agotado" cuando stockQuantity es 0', async () => {
    const html = await render({ ...baseProduct, stockQuantity: 0 });
    expect(html).toContain("Agotado");
  });

  it("no muestra Agotado con stock disponible", async () => {
    const html = await render(baseProduct);
    expect(html).not.toContain("Agotado");
  });

  it("renderiza un placeholder cuando image es null (no rompe)", async () => {
    const html = await render({ ...baseProduct, image: null });

    expect(html).toContain("Remera Jade");
    // placeholder con la inicial del nombre, sin etiqueta <img>
    expect(html).not.toContain("<img");
    expect(html).toContain(">R<");
  });
});
