export type ProductStatus = "draft" | "active" | "archived";

export type ProductPrice = {
  id: string;
  productId: string;
  currency: string;
  amountMinor: number;
};

export type ProductImage = {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  position: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
};

/** Vínculo producto↔categoría tal como llega del detalle (with category). */
export type ProductCategoryLink = { category: Category };

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: ProductStatus;
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
  prices: ProductPrice[];
  images: ProductImage[];
};

/** Detalle: agrega las categorías vinculadas. */
export type Product = ProductListItem & {
  categories: ProductCategoryLink[];
};
