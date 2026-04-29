import type {
  ProductRecord,
  ProductRepository,
} from "@/modules/catalog/application/product-repository";

export async function listOwnerProductsUseCase(
  input: {
    ownerId: string;
  },
  dependencies: {
    productRepository: ProductRepository;
  },
): Promise<ProductRecord[]> {
  return dependencies.productRepository.listByOwnerId(input.ownerId);
}

export async function getOwnerProductUseCase(
  input: {
    ownerId: string;
    productId: string;
  },
  dependencies: {
    productRepository: ProductRepository;
  },
): Promise<ProductRecord | null> {
  const product = await dependencies.productRepository.findById(input.productId);

  if (!product || product.ownerId !== input.ownerId) {
    return null;
  }

  return product;
}
