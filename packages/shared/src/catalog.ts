import { categories, productImages, productPrices, products, productStatus } from "@avanzar/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Productos
export const productSelectSchema = createSelectSchema(products);
export const productInsertSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Precios
export const productPriceSelectSchema = createSelectSchema(productPrices);
export const productPriceInsertSchema = createInsertSchema(productPrices).omit({
  id: true,
});

// Imágenes
export const productImageSelectSchema = createSelectSchema(productImages);
export const productImageInsertSchema = createInsertSchema(productImages).omit({
  id: true,
});

// Categorías
export const categorySelectSchema = createSelectSchema(categories);
export const categoryInsertSchema = createInsertSchema(categories).omit({
  id: true,
});

export type Product = z.infer<typeof productSelectSchema>;
export type ProductInput = z.infer<typeof productInsertSchema>;
export type ProductPriceInput = z.infer<typeof productPriceInsertSchema>;
export type ProductImageInput = z.infer<typeof productImageInsertSchema>;
export type CategoryInput = z.infer<typeof categoryInsertSchema>;

/** Body de POST /admin/products/:id/categories (vincular categoría existente). */
export const linkCategorySchema = z.object({
  categoryId: z.uuid(),
});

export type LinkCategoryInput = z.infer<typeof linkCategorySchema>;

/**
 * Query de GET /admin/products. status y q opcionales pero validados.
 * `q` vacío ("" — p. ej. al limpiar el buscador) se trata como ausente, no como error.
 */
export const productAdminQuerySchema = z.object({
  status: z.enum(productStatus.enumValues).optional(),
  q: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
});

export type ProductAdminQuery = z.infer<typeof productAdminQuerySchema>;
