import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { OrderRepository } from "@/modules/orders/application/order-repository";
import type { PaymentRepository } from "@/modules/payments/application/payment-repository";
import {
  enqueueShipmentCreationForReadyOrderUseCase,
  ShipmentCreationRetryUnavailableError,
} from "@/modules/shipping/application/enqueue-shipment-creation";
import type { ShipmentJobQueue } from "@/modules/shipping/application/shipment-job-queue";
import type { ShipmentRepository } from "@/modules/shipping/application/shipment-repository";

export type RetryShipmentCreationInput = {
  orderId: string;
  ownerId: string;
};

type RetryShipmentCreationDependencies = {
  auditEventRepository: AuditEventRepository;
  now?: () => Date;
  orderRepository: OrderRepository;
  paymentRepository: PaymentRepository;
  shipmentJobQueue: ShipmentJobQueue;
  shipmentRepository: ShipmentRepository;
};

export class ShipmentRetryOrderNotFoundError extends Error {
  constructor() {
    super("Shipment retry order was not found");
    this.name = "ShipmentRetryOrderNotFoundError";
  }
}

export { ShipmentCreationRetryUnavailableError };

export async function retryShipmentCreationUseCase(
  input: RetryShipmentCreationInput,
  dependencies: RetryShipmentCreationDependencies,
) {
  const order = await dependencies.orderRepository.findById(input.orderId);

  if (!order || order.ownerId !== input.ownerId) {
    throw new ShipmentRetryOrderNotFoundError();
  }

  return enqueueShipmentCreationForReadyOrderUseCase(
    {
      actorUserId: input.ownerId,
      orderId: input.orderId,
      requestedBy: "owner",
      requireFailedShipment: true,
    },
    dependencies,
  );
}
