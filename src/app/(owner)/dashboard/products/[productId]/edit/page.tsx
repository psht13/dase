import Link from "next/link";
import { getOwnerProductUseCase } from "@/modules/catalog/application/read-owner-products";
import { updateProductAction } from "@/modules/catalog/ui/product-actions";
import { ProductForm } from "@/modules/catalog/ui/product-form";
import { priceMinorToFormValue } from "@/modules/catalog/application/product-validation";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { Button } from "@/shared/ui/button";

type EditProductPageProps = {
  params: Promise<{
    productId: string;
  }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const [{ productId }, owner] = await Promise.all([
    params,
    requireOwnerSession(),
  ]);
  const product = await getOwnerProductUseCase(
    {
      ownerId: owner.id,
      productId,
    },
    {
      productRepository: getProductRepository(),
    },
  );

  if (!product) {
    return (
      <div className="mx-auto grid max-w-3xl gap-4">
        <h1 className="font-display text-3xl font-semibold">
          Товар не знайдено
        </h1>
        <p className="text-sm text-muted-foreground">
          Перевірте каталог або створіть новий товар.
        </p>
        <div>
          <Button asChild variant="outline">
            <Link href="/dashboard/products">До каталогу</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">
          Редагування товару
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{product.name}</p>
      </div>

      <ProductForm
        action={updateProductAction.bind(null, product.id)}
        cancelHref="/dashboard/products"
        defaultValues={{
          description: product.description ?? "",
          imageUrls: product.images.length
            ? product.images.map((image) => ({ url: image.url }))
            : [{ url: "" }],
          isActive: product.isActive,
          name: product.name,
          price: priceMinorToFormValue(product.priceMinor),
          sku: product.sku,
          stockQuantity: String(product.stockQuantity),
        }}
        submitLabel="Зберегти товар"
      />
    </div>
  );
}
