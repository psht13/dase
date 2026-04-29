import type {
  ProductRecord,
  ProductRepository,
} from "@/modules/catalog/application/product-repository";
import type { ValidatedProductInput } from "@/modules/catalog/application/product-validation";
import { ProductSkuAlreadyExistsError } from "@/modules/catalog/application/create-product";

export type UpdateProductInput = ValidatedProductInput & {
  ownerId: string;
  productId: string;
};

export class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Product not found: ${productId}`);
    this.name = "ProductNotFoundError";
  }
}

export async function updateProductUseCase(
  input: UpdateProductInput,
  dependencies: {
    productRepository: ProductRepository;
  },
): Promise<ProductRecord> {
  const existingProduct = await assertOwnerProduct(input, dependencies);
  const productWithSku = await dependencies.productRepository.findBySku(
    input.sku,
  );

  if (productWithSku && productWithSku.id !== existingProduct.id) {
    throw new ProductSkuAlreadyExistsError(input.sku);
  }

  return dependencies.productRepository.update(input.productId, {
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

export async function setProductActiveUseCase(
  input: {
    isActive: boolean;
    ownerId: string;
    productId: string;
  },
  dependencies: {
    productRepository: ProductRepository;
  },
): Promise<ProductRecord> {
  const existingProduct = await assertOwnerProduct(input, dependencies);

  return dependencies.productRepository.update(input.productId, {
    description: existingProduct.description,
    images: existingProduct.images.map((image) => ({
      altText: image.altText,
      sortOrder: image.sortOrder,
      url: image.url,
    })),
    isActive: input.isActive,
    name: existingProduct.name,
    ownerId: input.ownerId,
    priceMinor: existingProduct.priceMinor,
    sku: existingProduct.sku,
    stockQuantity: existingProduct.stockQuantity,
  });
}

async function assertOwnerProduct(
  input: {
    ownerId: string;
    productId: string;
  },
  dependencies: {
    productRepository: ProductRepository;
  },
): Promise<ProductRecord> {
  const existingProduct = await dependencies.productRepository.findById(
    input.productId,
  );

  if (!existingProduct || existingProduct.ownerId !== input.ownerId) {
    throw new ProductNotFoundError(input.productId);
  }

  return existingProduct;
}
