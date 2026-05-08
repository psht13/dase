import { Plus } from "lucide-react";
import Link from "next/link";
import { listOwnerProductsUseCase } from "@/modules/catalog/application/read-owner-products";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { toggleProductActiveAction } from "@/modules/catalog/ui/product-actions";
import { ProductTable } from "@/modules/catalog/ui/product-table";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-layout";

export default async function ProductsPage() {
  const owner = await requireOwnerSession();
  const products = await listOwnerProductsUseCase(
    {
      ownerId: owner.id,
    },
    {
      productRepository: getProductRepository(),
    },
  );

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        actions={
          <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus aria-hidden="true" className="size-4" />
            Створити товар
          </Link>
          </Button>
        }
        description="Товари власника для створення замовлень."
        title="Каталог товарів"
        titleClassName="sm:text-3xl"
      />

      <ProductTable
        products={products}
        toggleAction={toggleProductActiveAction}
      />
    </div>
  );
}
