import { listOrderBuilderProductsUseCase } from "@/modules/orders/application/list-order-builder-products";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { createOrderDraftAction } from "@/modules/orders/ui/order-actions";
import { OrderBuilderForm } from "@/modules/orders/ui/order-builder-form";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

export default async function NewOrderPage() {
  const owner = await requireOwnerSession();
  const products = await listOrderBuilderProductsUseCase(
    {
      ownerId: owner.id,
    },
    {
      productRepository: getProductRepository(),
    },
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">
          Створити посилання замовлення
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Оберіть активні товари, вкажіть кількість і надішліть клієнту
          безпечне публічне посилання.
        </p>
      </div>

      <OrderBuilderForm action={createOrderDraftAction} products={products} />
    </div>
  );
}
