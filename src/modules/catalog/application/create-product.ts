import type {
  ProductRecord,
  ProductRepository,
} from "@/modules/catalog/application/product-repository";
import type { ValidatedProductInput } from "@/modules/catalog/application/product-validation";

export type CreateProductInput = ValidatedProductInput & {
  ownerId: string;
};

export class ProductSkuAlreadyExistsError extends Error {
  constructor(sku: string) {
    super(`Product SKU already exists: ${sku}`);
    this.name = "ProductSkuAlreadyExistsError";
  }
}

export async function createProductUseCase(
  input: CreateProductInput,
  dependencies: {
    productRepository: ProductRepository;
  },
): Promise<ProductRecord> {
  const existingProduct = await dependencies.productRepository.findBySku(
    input.sku,
  );

  if (existingProduct) {
    throw new ProductSkuAlreadyExistsError(input.sku);
  }

  return dependencies.productRepository.save({
    description: input.description,
    images: input.images,
    isActive: input.isActive,
    name: input.name,
    ownerId: input.ownerId,
    priceMinor: input.priceMinor,
    sku: input.sku,
    stockQuantity: input.stockQuantity,
  });
}
