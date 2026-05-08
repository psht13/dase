import { listOrderBuilderProductsUseCase } from "@/modules/orders/application/list-order-builder-products";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { createOrderDraftAction } from "@/modules/orders/ui/order-actions";
import { OrderBuilderForm } from "@/modules/orders/ui/order-builder-form";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { PageHeader } from "@/shared/ui/page-layout";

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
    <div className="grid min-w-0 gap-6">
      <PageHeader
        description="Оберіть активні товари, вкажіть кількість і надішліть клієнту безпечне публічне посилання."
        title="Створити посилання замовлення"
        titleClassName="sm:text-3xl"
      />

      <OrderBuilderForm action={createOrderDraftAction} products={products} />
    </div>
  );
}
