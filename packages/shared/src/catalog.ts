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

/** Body de PATCH /admin/products/:id/images/reorder (nuevo orden de imágenes). */
export const imageReorderSchema = z.object({
  imageIds: z.array(z.uuid()).min(1),
});

export type ImageReorderInput = z.infer<typeof imageReorderSchema>;

/**
 * Query de GET /admin/products. status y q opcionales pero validados.
 * `q` vacío ("" — p. ej. al limpiar el buscador) se trata como ausente, no como error.
 */
export const productAdminQuerySchema = z.object({
  status: z.enum(productStatus.enumValues).optional(),
  q: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
});

export type ProductAdminQuery = z.infer<typeof productAdminQuerySchema>;

/** Monedas soportadas por el storefront. */
export const SUPPORTED_CURRENCIES = ["USD", "CUP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const emptyToUndef = (v: unknown) => (v === "" ? undefined : v);

/**
 * Query de GET /products (catálogo público). Currency-aware: filtra por moneda,
 * categoría, texto y rango de precio; ordena y pagina.
 */
export const productPublicQuerySchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES).default("USD"),
  category: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  q: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  sort: z.enum(["price_asc", "price_desc", "name", "newest"]).default("newest"),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});

export type ProductPublicQuery = z.infer<typeof productPublicQuerySchema>;

/** Item de la grilla del catálogo público (forma expuesta al front). */
export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  priceMinor: number;
  currency: string;
  image: { url: string; alt: string | null } | null;
  stockQuantity: number;
};

/** Respuesta de GET /products (lista paginada). */
export type ProductListResponse = {
  products: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
};

/** Array de estados de producto (para selects del front sin tocar @avanzar/db). */
export const PRODUCT_STATUSES: readonly (typeof productStatus.enumValues)[number][] =
  productStatus.enumValues;
