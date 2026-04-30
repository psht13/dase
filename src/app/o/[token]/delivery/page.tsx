import Link from "next/link";
import { lookupPublicOrderUseCase } from "@/modules/orders/application/lookup-public-order";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { confirmDeliveryAction } from "@/modules/orders/ui/delivery-actions";
import { DeliveryForm } from "@/modules/orders/ui/delivery-form";
import { PublicOrderUnavailable } from "@/modules/orders/ui/public-order-review";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Button } from "@/shared/ui/button";

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
    <main
      className="min-h-screen bg-[hsl(var(--brand-shell))]"
      id="main-content"
    >
      <section className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-10">
        <div className="grid gap-2">
          <BrandMark subtitle="підтвердження замовлення" />
          <h1 className="font-display text-4xl font-semibold">
            Доставка та оплата
          </h1>
          <p className="text-sm text-muted-foreground">
            Вкажіть контактні дані, службу доставки, відділення та спосіб
            оплати.
          </p>
        </div>

        <DeliveryForm action={confirmDeliveryAction.bind(null, token)} />

        <div className="flex justify-start gap-3">
          <Button asChild variant="outline">
            <Link href={`/o/${result.order.publicToken}`}>Назад</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
