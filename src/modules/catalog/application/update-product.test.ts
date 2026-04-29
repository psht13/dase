import { createProductUseCase } from "./create-product";
import {
  ProductNotFoundError,
  setProductActiveUseCase,
  updateProductUseCase,
} from "./update-product";
import { InMemoryProductRepository } from "@/modules/catalog/infrastructure/in-memory-product-repository";

describe("updateProductUseCase", () => {
  it("updates an owner product and replaces images", async () => {
    const repository = new InMemoryProductRepository();
    const product = await seedProduct(repository);

    const updatedProduct = await updateProductUseCase(
      {
        description: "Оновлена каблучка",
        images: [{ sortOrder: 0, url: "https://example.com/new-ring.jpg" }],
        isActive: false,
        name: "Оновлена каблучка",
        ownerId: "owner-1",
        priceMinor: 150_00,
        productId: product.id,
        sku: "RING-2",
        stockQuantity: 2,
      },
      { productRepository: repository },
    );

    expect(updatedProduct).toMatchObject({
      description: "Оновлена каблучка",
      images: [{ url: "https://example.com/new-ring.jpg" }],
      isActive: false,
      priceMinor: 150_00,
      sku: "RING-2",
    });
  });

  it("prevents another owner from updating a product", async () => {
    const repository = new InMemoryProductRepository();
    const product = await seedProduct(repository);

    await expect(
      updateProductUseCase(
        {
          description: null,
          images: [{ sortOrder: 0, url: "https://example.com/ring.jpg" }],
          isActive: true,
          name: "Каблучка",
          ownerId: "owner-2",
          priceMinor: 120_00,
          productId: product.id,
          sku: "RING-1",
          stockQuantity: 3,
        },
        { productRepository: repository },
      ),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it("toggles active state through the owner use case", async () => {
    const repository = new InMemoryProductRepository();
    const product = await seedProduct(repository);

    await expect(
      setProductActiveUseCase(
        {
          isActive: false,
          ownerId: "owner-1",
          productId: product.id,
        },
        { productRepository: repository },
      ),
    ).resolves.toMatchObject({
      isActive: false,
      name: "Каблучка",
    });
  });
});

async function seedProduct(repository: InMemoryProductRepository) {
  return createProductUseCase(
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
}
