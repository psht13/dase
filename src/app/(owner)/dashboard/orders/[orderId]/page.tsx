import { notFound } from "next/navigation";
import {
  getOwnerOrderDetailsUseCase,
  listOwnerOrderTagsUseCase,
} from "@/modules/orders/application/owner-order-read-model";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getCustomerRepository } from "@/modules/orders/infrastructure/customer-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getOrderTagRepository } from "@/modules/orders/infrastructure/order-tag-repository-factory";
import { OwnerOrderDetailsView } from "@/modules/orders/ui/owner-order-details-view";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

type OrderDetailsPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function OrderDetailsPage({
  params,
}: OrderDetailsPageProps) {
  const [{ orderId }, owner] = await Promise.all([
    params,
    requireOwnerSession(),
  ]);
  const orderTagRepository = getOrderTagRepository();
  const [order, availableTags] = await Promise.all([
    getOwnerOrderDetailsUseCase(
      {
        orderId,
        ownerId: owner.id,
      },
      {
        auditEventRepository: getAuditEventRepository(),
        customerRepository: getCustomerRepository(),
        orderRepository: getOrderRepository(),
        orderTagRepository,
        paymentRepository: getPaymentRepository(),
        shipmentRepository: getShipmentRepository(),
      },
    ),
    listOwnerOrderTagsUseCase(
      { ownerId: owner.id },
      { orderTagRepository },
    ),
  ]);

  if (!order) {
    notFound();
  }

  return <OwnerOrderDetailsView availableTags={availableTags} order={order} />;
}
