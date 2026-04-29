import { createProductUseCase } from "@/modules/catalog/application/create-product";
import {
  getOwnerProductUseCase,
  listOwnerProductsUseCase,
} from "@/modules/catalog/application/read-owner-products";
import { InMemoryProductRepository } from "@/modules/catalog/infrastructure/in-memory-product-repository";

describe("owner product read use cases", () => {
  it("lists products for the requested owner", async () => {
    const repository = new InMemoryProductRepository();
    await seedProduct(repository, { name: "Каблучка", ownerId: "owner-1" });
    await seedProduct(repository, { name: "Підвіска", ownerId: "owner-2" });

    await expect(
      listOwnerProductsUseCase(
        {
          ownerId: "owner-1",
        },
        {
          productRepository: repository,
        },
      ),
    ).resolves.toMatchObject([{ name: "Каблучка", ownerId: "owner-1" }]);
  });

  it("returns an owner product by id", async () => {
    const repository = new InMemoryProductRepository();
    const product = await seedProduct(repository, {
      name: "Каблучка",
      ownerId: "owner-1",
    });

    await expect(
      getOwnerProductUseCase(
        {
          ownerId: "owner-1",
          productId: product.id,
        },
        {
          productRepository: repository,
        },
      ),
    ).resolves.toMatchObject({ id: product.id, name: "Каблучка" });
  });

  it("does not expose another owner's product", async () => {
    const repository = new InMemoryProductRepository();
    const product = await seedProduct(repository, {
      name: "Каблучка",
      ownerId: "owner-1",
    });

    await expect(
      getOwnerProductUseCase(
        {
          ownerId: "owner-2",
          productId: product.id,
        },
        {
          productRepository: repository,
        },
      ),
    ).resolves.toBeNull();
  });
});

async function seedProduct(
  repository: InMemoryProductRepository,
  input: {
    name: string;
    ownerId: string;
  },
) {
  return createProductUseCase(
    {
      description: null,
      images: [{ sortOrder: 0, url: "https://example.com/ring.jpg" }],
      isActive: true,
      name: input.name,
      ownerId: input.ownerId,
      priceMinor: 120_00,
      sku: `${input.ownerId}-${input.name}`,
      stockQuantity: 3,
    },
    { productRepository: repository },
  );
}
