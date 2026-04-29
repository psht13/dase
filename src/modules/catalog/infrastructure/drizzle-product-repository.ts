import { asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  ProductImageRecord,
  ProductRecord,
  ProductRepository,
  SaveProductInput,
} from "@/modules/catalog/application/product-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbProduct = typeof schema.products.$inferSelect;
type DbProductImage = typeof schema.productImages.$inferSelect;

export class DrizzleProductRepository implements ProductRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<ProductRecord | null> {
    const [product] = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .limit(1);

    return this.mapProductWithImages(product);
  }

  async findBySku(sku: string): Promise<ProductRecord | null> {
    const [product] = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.sku, sku))
      .limit(1);

    return this.mapProductWithImages(product);
  }

  async save(input: SaveProductInput): Promise<ProductRecord> {
    const [product] = await this.db
      .insert(schema.products)
      .values({
        currency: input.currency ?? "UAH",
        description: input.description ?? null,
        isActive: input.isActive ?? true,
        name: input.name,
        ownerId: input.ownerId ?? null,
        priceCents: input.priceMinor,
        sku: input.sku,
        stockQuantity: input.stockQuantity ?? 0,
      })
      .returning();

    if (!product) {
      throw new Error("Failed to save product");
    }

    if (input.images?.length) {
      await this.db.insert(schema.productImages).values(
        input.images.map((image) => ({
          altText: image.altText ?? null,
          productId: product.id,
          sortOrder: image.sortOrder,
          url: image.url,
        })),
      );
    }

    const images = await this.findImages(product.id);

    return mapProduct(product, images);
  }

  private async mapProductWithImages(
    product: DbProduct | undefined,
  ): Promise<ProductRecord | null> {
    if (!product) {
      return null;
    }

    return mapProduct(product, await this.findImages(product.id));
  }

  private async findImages(productId: string): Promise<DbProductImage[]> {
    return this.db
      .select()
      .from(schema.productImages)
      .where(eq(schema.productImages.productId, productId))
      .orderBy(asc(schema.productImages.sortOrder));
  }
}

function mapProduct(
  product: DbProduct,
  images: readonly DbProductImage[],
): ProductRecord {
  return {
    createdAt: product.createdAt,
    currency: product.currency,
    description: product.description,
    id: product.id,
    images: images.map(mapProductImage),
    isActive: product.isActive,
    name: product.name,
    ownerId: product.ownerId,
    priceMinor: product.priceCents,
    sku: product.sku,
    stockQuantity: product.stockQuantity,
    updatedAt: product.updatedAt,
  };
}

function mapProductImage(image: DbProductImage): ProductImageRecord {
  return {
    altText: image.altText,
    createdAt: image.createdAt,
    id: image.id,
    productId: image.productId,
    sortOrder: image.sortOrder,
    url: image.url,
  };
}
