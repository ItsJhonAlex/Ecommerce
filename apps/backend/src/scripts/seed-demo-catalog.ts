/**
 * Siembra productos demo en el catálogo (para dev/smoke del storefront).
 * Idempotente por slug (onConflictDoNothing). Correr con:
 *   bun run --env-file=../../.env src/scripts/seed-demo-catalog.ts
 */
import { db } from "@avanzar/db";
import {
  categories,
  productCategories,
  productImages,
  productPrices,
  products,
} from "@avanzar/db/schema";

const cats = await db.select().from(categories);
const cat = cats.find((c) => c.slug === "anillos") ?? cats[0];

const demo = [
  {
    slug: "anillo-jade-demo",
    name: "Anillo de Jade",
    description: "Anillo artesanal con piedra de jade natural.",
    stock: 12,
    usd: 4500,
    cup: 1_620_00,
    img: "https://placehold.co/600x600/1f9d70/ffffff?text=Jade",
  },
  {
    slug: "collar-coral-demo",
    name: "Collar de Coral",
    description: "Collar tejido a mano con cuentas de coral.",
    stock: 5,
    usd: 3200,
    cup: 1_152_00,
    img: "https://placehold.co/600x600/e8613a/ffffff?text=Coral",
  },
  {
    slug: "pulsera-agotada-demo",
    name: "Pulsera Tejida (agotada)",
    description: "Pulsera de hilo encerado. Edición limitada.",
    stock: 0,
    usd: 1800,
    cup: 648_00,
    img: "https://placehold.co/600x600/999999/ffffff?text=Pulsera",
  },
];

for (const d of demo) {
  const [p] = await db
    .insert(products)
    .values({
      slug: d.slug,
      name: d.name,
      description: d.description,
      status: "active",
      stockQuantity: d.stock,
    })
    .onConflictDoNothing()
    .returning();
  if (!p) {
    console.log(`skip (ya existe): ${d.slug}`);
    continue;
  }
  await db.insert(productPrices).values([
    { productId: p.id, currency: "USD", amountMinor: d.usd },
    { productId: p.id, currency: "CUP", amountMinor: d.cup },
  ]);
  await db.insert(productImages).values({
    productId: p.id,
    url: d.img,
    alt: d.name,
    position: 0,
  });
  if (cat) {
    await db
      .insert(productCategories)
      .values({ productId: p.id, categoryId: cat.id });
  }
  console.log(`seeded: ${d.slug} (categoría ${cat?.slug ?? "—"})`);
}

console.log("Listo.");
process.exit(0);
