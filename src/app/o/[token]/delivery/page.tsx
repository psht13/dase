import Link from "next/link";
import { lookupPublicOrderUseCase } from "@/modules/orders/application/lookup-public-order";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { confirmDeliveryAction } from "@/modules/orders/ui/delivery-actions";
import { DeliveryForm } from "@/modules/orders/ui/delivery-form";
import { PublicOrderUnavailable } from "@/modules/orders/ui/public-order-review";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Button } from "@/shared/ui/button";
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
      paymentRepository: getPaymentRepository(),
    },
  );

  if (!result.available) {
    return <PublicOrderUnavailable />;
  }

  return (
    <PageShell contentClassName="grid gap-6" maxWidth="lg">
        <div className="grid gap-2">
          <BrandMark subtitle="підтвердження замовлення" />
          <PageHeader
            description="Вкажіть контактні дані, службу доставки, відділення та спосіб оплати."
            title="Доставка та оплата"
          />
        </div>

        <DeliveryForm action={confirmDeliveryAction.bind(null, token)} />

        <div className="flex justify-start gap-3">
          <Button asChild variant="outline">
            <Link href={`/o/${result.order.publicToken}`}>Назад</Link>
          </Button>
        </div>
    </PageShell>
  );
}
