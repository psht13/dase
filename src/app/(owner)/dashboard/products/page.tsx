import { Plus } from "lucide-react";
import Link from "next/link";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { toggleProductActiveAction } from "@/modules/catalog/ui/product-actions";
import { ProductTable } from "@/modules/catalog/ui/product-table";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { Button } from "@/shared/ui/button";

export default async function ProductsPage() {
  const owner = await requireOwnerSession();
  const products = await getProductRepository().listByOwnerId(owner.id);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            Каталог товарів
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Товари власника для створення замовлень.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="size-4" />
            Створити товар
          </Link>
        </Button>
      </div>

      <ProductTable
        products={products}
        toggleAction={toggleProductActiveAction}
      />
    </div>
  );
}
