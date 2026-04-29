import { lookupPublicOrderUseCase } from "@/modules/orders/application/lookup-public-order";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import {
  PublicOrderReview,
  PublicOrderUnavailable,
} from "@/modules/orders/ui/public-order-review";

type PublicOrderPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PublicOrderPage({ params }: PublicOrderPageProps) {
  const { token } = await params;
  const result = await lookupPublicOrderUseCase(
    {
      publicToken: token,
    },
    {
      orderRepository: getOrderRepository(),
    },
  );

  if (!result.available) {
    return <PublicOrderUnavailable />;
  }

  return (
    <PublicOrderReview
      deliveryHref={`/o/${result.order.publicToken}/delivery`}
      order={result.order}
    />
  );
}
