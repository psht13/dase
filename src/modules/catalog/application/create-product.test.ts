import {
  createProductUseCase,
  ProductSkuAlreadyExistsError,
} from "./create-product";
import { InMemoryProductRepository } from "@/modules/catalog/infrastructure/in-memory-product-repository";

describe("createProductUseCase", () => {
  it("creates an owner product with external image URLs", async () => {
    const repository = new InMemoryProductRepository();

    const product = await createProductUseCase(
      {
        description: "Срібна каблучка",
        images: [{ sortOrder: 0, url: "https://example.com/ring.jpg" }],
        isActive: true,
        name: "Каблучка",
        ownerId: "owner-1",
        priceMinor: 120_00,
        sku: "RING-1",
        stockQuantity: 3,
      },
      { productRepository: repository },
    );

    expect(product).toMatchObject({
      images: [{ url: "https://example.com/ring.jpg" }],
      isActive: true,
      ownerId: "owner-1",
      sku: "RING-1",
    });
    await expect(repository.listByOwnerId("owner-1")).resolves.toHaveLength(1);
  });

  it("rejects duplicate product SKU values", async () => {
    const repository = new InMemoryProductRepository();
    const input = {
      description: null,
      images: [{ sortOrder: 0, url: "https://example.com/ring.jpg" }],
      isActive: true,
      name: "Каблучка",
      ownerId: "owner-1",
      priceMinor: 120_00,
      sku: "RING-1",
      stockQuantity: 3,
    };

    await createProductUseCase(input, { productRepository: repository });

    await expect(
      createProductUseCase(input, { productRepository: repository }),
    ).rejects.toBeInstanceOf(ProductSkuAlreadyExistsError);
  });
});
