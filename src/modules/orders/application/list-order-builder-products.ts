import type { ProductRepository } from "@/modules/catalog/application/product-repository";

export type OrderBuilderProduct = {
  currency: string;
  id: string;
  imageUrl: string | null;
  name: string;
  priceMinor: number;
  sku: string;
  stockQuantity: number;
};

export async function listOrderBuilderProductsUseCase(
  input: {
    ownerId: string;
  },
  dependencies: {
    productRepository: ProductRepository;
  },
): Promise<OrderBuilderProduct[]> {
  const products = await dependencies.productRepository.listByOwnerId(
    input.ownerId,
  );

  return products
    .filter((product) => product.isActive)
    .map((product) => ({
      currency: product.currency,
      id: product.id,
      imageUrl: product.images[0]?.url ?? null,
      name: product.name,
      priceMinor: product.priceMinor,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
    }));
}
