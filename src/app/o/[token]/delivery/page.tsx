import { lookupPublicOrderUseCase } from "@/modules/orders/application/lookup-public-order";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { confirmDeliveryAction } from "@/modules/orders/ui/delivery-actions";
import { DeliveryForm } from "@/modules/orders/ui/delivery-form";
import {
  PublicOrderStatus,
  PublicOrderUnavailable,
} from "@/modules/orders/ui/public-order-review";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getPaymentRequisiteRepository } from "@/modules/payments/infrastructure/payment-requisite-repository-factory";
import { retryPublicMonobankPaymentAction } from "@/modules/payments/ui/payment-actions";
import { BrandMark } from "@/shared/ui/brand-mark";
import { PageHeader, PageShell } from "@/shared/ui/page-layout";

type PublicDeliveryPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PublicDeliveryPage({
  params,
}: PublicDeliveryPageProps) {
  const { token } = await params;
  const result = await lookupPublicOrderUseCase(
    {
      publicToken: token,
    },
    {
      orderRepository: getOrderRepository(),
      paymentRequisiteRepository: getPaymentRequisiteRepository(),
      paymentRepository: getPaymentRepository(),
    },
  );

  if (!result.available) {
    return <PublicOrderUnavailable />;
  }

  if (result.order.state === "status") {
    return (
      <PublicOrderStatus
        order={result.order}
        paymentRetryAction={retryPublicMonobankPaymentAction.bind(
          null,
          result.order.publicToken,
        )}
      />
    );
  }

  return (
    <PageShell contentClassName="grid gap-6" maxWidth="2xl">
      <div className="grid gap-2">
        <BrandMark subtitle="підтвердження замовлення" />
        <PageHeader
          description="Вкажіть контактні дані, службу доставки, відділення та спосіб оплати."
          title="Доставка та оплата"
        />
      </div>

      <DeliveryForm
        action={confirmDeliveryAction.bind(null, token)}
        cancelHref={`/o/${result.order.publicToken}`}
        paymentRequisites={result.order.paymentRequisites}
      />
    </PageShell>
  );
}
