export type ProductImageInput = {
  altText?: string | null;
  sortOrder: number;
  url: string;
};

export type ProductRecord = {
  createdAt: Date;
  currency: string;
  description: string | null;
  id: string;
  images: ProductImageRecord[];
  isActive: boolean;
  name: string;
  ownerId: string | null;
  priceMinor: number;
  sku: string;
  stockQuantity: number;
  updatedAt: Date;
};

export type ProductImageRecord = {
  altText: string | null;
  createdAt: Date;
  id: string;
  productId: string;
  sortOrder: number;
  url: string;
};

export type SaveProductInput = {
  currency?: string;
  description?: string | null;
  images?: ProductImageInput[];
  isActive?: boolean;
  name: string;
  ownerId?: string | null;
  priceMinor: number;
  sku: string;
  stockQuantity?: number;
};

export interface ProductRepository {
  findById(id: string): Promise<ProductRecord | null>;
  findBySku(sku: string): Promise<ProductRecord | null>;
  listByOwnerId(ownerId: string): Promise<ProductRecord[]>;
  save(input: SaveProductInput): Promise<ProductRecord>;
  update(id: string, input: SaveProductInput): Promise<ProductRecord>;
}
