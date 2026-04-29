import { randomUUID } from "node:crypto";
import type {
  ProductImageRecord,
  ProductRecord,
  ProductRepository,
  SaveProductInput,
} from "@/modules/catalog/application/product-repository";

export class InMemoryProductRepository implements ProductRepository {
  private readonly products = new Map<string, ProductRecord>();

  async findById(id: string): Promise<ProductRecord | null> {
    return this.products.get(id) ?? null;
  }

  async findBySku(sku: string): Promise<ProductRecord | null> {
    return (
      [...this.products.values()].find((product) => product.sku === sku) ?? null
    );
  }

  async listByOwnerId(ownerId: string): Promise<ProductRecord[]> {
    return [...this.products.values()]
      .filter((product) => product.ownerId === ownerId)
      .sort((first, second) => first.name.localeCompare(second.name, "uk"));
  }

  async save(input: SaveProductInput): Promise<ProductRecord> {
    const now = new Date();
    const product = toProductRecord({
      createdAt: now,
      id: randomUUID(),
      input,
      updatedAt: now,
    });

    this.products.set(product.id, product);

    return product;
  }

  async update(id: string, input: SaveProductInput): Promise<ProductRecord> {
    const existingProduct = this.products.get(id);

    if (!existingProduct) {
      throw new Error("Failed to update product");
    }

    const product = toProductRecord({
      createdAt: existingProduct.createdAt,
      id,
      input,
      updatedAt: new Date(),
    });

    this.products.set(product.id, product);

    return product;
  }
}

function toProductRecord(input: {
  createdAt: Date;
  id: string;
  input: SaveProductInput;
  updatedAt: Date;
}): ProductRecord {
  return {
    createdAt: input.createdAt,
    currency: input.input.currency ?? "UAH",
    description: input.input.description ?? null,
    id: input.id,
    images: toImageRecords(input.id, input.input.images ?? [], input.createdAt),
    isActive: input.input.isActive ?? true,
    name: input.input.name,
    ownerId: input.input.ownerId ?? null,
    priceMinor: input.input.priceMinor,
    sku: input.input.sku,
    stockQuantity: input.input.stockQuantity ?? 0,
    updatedAt: input.updatedAt,
  };
}

function toImageRecords(
  productId: string,
  images: NonNullable<SaveProductInput["images"]>,
  createdAt: Date,
): ProductImageRecord[] {
  return images.map((image) => ({
    altText: image.altText ?? null,
    createdAt,
    id: randomUUID(),
    productId,
    sortOrder: image.sortOrder,
    url: image.url,
  }));
}
