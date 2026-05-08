import Link from "next/link";
import { getOwnerProductUseCase } from "@/modules/catalog/application/read-owner-products";
import { updateProductAction } from "@/modules/catalog/ui/product-actions";
import { ProductForm } from "@/modules/catalog/ui/product-form";
import { priceMinorToFormValue } from "@/modules/catalog/application/product-validation";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-layout";

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
      <div className="mx-auto grid w-full max-w-3xl min-w-0 gap-4">
        <PageHeader
          description="Перевірте каталог або створіть новий товар."
          title="Товар не знайдено"
          titleClassName="sm:text-3xl"
        />
        <div>
          <Button asChild variant="outline">
            <Link href="/dashboard/products">До каталогу</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-6">
      <PageHeader
        description={product.name}
        title="Редагування товару"
        titleClassName="sm:text-3xl"
      />

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
