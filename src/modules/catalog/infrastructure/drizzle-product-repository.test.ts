import { DrizzleProductRepository } from "./drizzle-product-repository";
import type * as schema from "@/shared/db/schema";

function createSelectChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    limit: vi.fn(async () => result),
    orderBy: vi.fn(async () => result),
    where: vi.fn(() => chain),
  };

  return chain;
}

describe("DrizzleProductRepository", () => {
  const now = new Date("2026-04-30T00:00:00.000Z");
  const product = {
    createdAt: now,
    currency: "UAH",
    description: "Срібна каблучка",
    id: "product-1",
    isActive: true,
    name: "Каблучка",
    ownerId: "owner-1",
    priceCents: 120_00,
    sku: "RING-1",
    stockQuantity: 3,
    updatedAt: now,
  } satisfies typeof schema.products.$inferSelect;
  const image = {
    altText: "Каблучка",
    createdAt: now,
    id: "image-1",
    productId: "product-1",
    sortOrder: 0,
    url: "https://example.com/ring.jpg",
  } satisfies typeof schema.productImages.$inferSelect;

  it("maps products and image rows from Drizzle", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectChain([product]))
        .mockReturnValueOnce(createSelectChain([image])),
    };
    const repository = new DrizzleProductRepository(db as never);

    await expect(repository.findById("product-1")).resolves.toMatchObject({
      id: "product-1",
      images: [{ id: "image-1", url: "https://example.com/ring.jpg" }],
      priceMinor: 120_00,
    });
  });

  it("returns null when product is absent", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(createSelectChain([])),
    };
    const repository = new DrizzleProductRepository(db as never);

    await expect(repository.findBySku("missing")).resolves.toBeNull();
  });

  it("saves product rows with external image URLs", async () => {
    const productInsert = {
      values: vi.fn(() => ({
        returning: vi.fn(async () => [product]),
      })),
    };
    const imageInsert = {
      values: vi.fn(async () => undefined),
    };
    const db = {
      insert: vi
        .fn()
        .mockReturnValueOnce(productInsert)
        .mockReturnValueOnce(imageInsert),
      select: vi.fn().mockReturnValueOnce(createSelectChain([image])),
    };
    const repository = new DrizzleProductRepository(db as never);

    const savedProduct = await repository.save({
      description: "Срібна каблучка",
      images: [{ altText: "Каблучка", sortOrder: 0, url: image.url }],
      name: "Каблучка",
      ownerId: "owner-1",
      priceMinor: 120_00,
      sku: "RING-1",
      stockQuantity: 3,
    });

    expect(productInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({ priceCents: 120_00, sku: "RING-1" }),
    );
    expect(imageInsert.values).toHaveBeenCalledWith([
      expect.objectContaining({ productId: "product-1", url: image.url }),
    ]);
    expect(savedProduct.images).toHaveLength(1);
  });
});
