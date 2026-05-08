import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { OrderRepository } from "@/modules/orders/application/order-repository";
import { assertOrderStatusTransition } from "@/modules/orders/domain/status";
import type {
  PaymentRecord,
  PaymentRepository,
} from "@/modules/payments/application/payment-repository";
import { enqueueShipmentCreationForReadyOrderUseCase } from "@/modules/shipping/application/enqueue-shipment-creation";
import type { ShipmentJobQueue } from "@/modules/shipping/application/shipment-job-queue";
import type { ShipmentRepository } from "@/modules/shipping/application/shipment-repository";

export type MarkManualCardPaymentPaidResult = {
  enqueuedShipment: boolean;
  orderId: string;
  paymentId: string;
};

type MarkManualCardPaymentPaidDependencies = {
  auditEventRepository: AuditEventRepository;
  now?: () => Date;
  orderRepository: OrderRepository;
  paymentRepository: PaymentRepository;
  shipmentJobQueue: ShipmentJobQueue;
  shipmentRepository: ShipmentRepository;
};

export class ManualCardPaymentNotFoundError extends Error {
  constructor() {
    super("Manual card payment was not found");
    this.name = "ManualCardPaymentNotFoundError";
  }
}

export class ManualCardPaymentCannotBeMarkedPaidError extends Error {
  constructor() {
    super("Manual card payment cannot be marked paid");
    this.name = "ManualCardPaymentCannotBeMarkedPaidError";
  }
}

export async function markManualCardPaymentPaidUseCase(
  input: {
    orderId: string;
    ownerId: string;
  },
  dependencies: MarkManualCardPaymentPaidDependencies,
): Promise<MarkManualCardPaymentPaidResult> {
  const order = await dependencies.orderRepository.findById(input.orderId);

  if (!order || order.ownerId !== input.ownerId) {
    throw new ManualCardPaymentNotFoundError();
  }

  const payment = await findManualCardPayment(
    order.id,
    dependencies.paymentRepository,
  );

  if (!payment) {
    throw new ManualCardPaymentNotFoundError();
  }

  if (payment.status !== "PENDING" || order.status !== "PAYMENT_PENDING") {
    throw new ManualCardPaymentCannotBeMarkedPaidError();
  }

  try {
    assertOrderStatusTransition(order.status, "PAID");
  } catch {
    throw new ManualCardPaymentCannotBeMarkedPaidError();
  }

  const paidAt = dependencies.now?.() ?? new Date();

  await dependencies.paymentRepository.updateStatus({
    failureReason: null,
    paidAt,
    paymentId: payment.id,
    providerModifiedAt: null,
    status: "PAID",
  });
  await dependencies.orderRepository.updateStatus(order.id, "PAID");
  await dependencies.auditEventRepository.append({
    actorCustomerId: null,
    actorType: "OWNER",
    actorUserId: input.ownerId,
    eventType: "MANUAL_PAYMENT_MARKED_PAID",
    orderId: order.id,
    payload: {
      message: "Ручну оплату картою підтверджено власником",
      paymentId: payment.id,
      paymentMethod: "MANUAL_CARD_TRANSFER",
      paymentStatus: "PAID",
      status: "PAID",
    },
  });

  const shipmentEnqueue = await enqueueShipmentCreationForReadyOrderUseCase(
    {
      actorUserId: input.ownerId,
      orderId: order.id,
      requestedBy: "owner",
    },
    dependencies,
  );

  return {
    enqueuedShipment: shipmentEnqueue.enqueued,
    orderId: order.id,
    paymentId: payment.id,
  };
}

async function findManualCardPayment(
  orderId: string,
  paymentRepository: PaymentRepository,
): Promise<PaymentRecord | null> {
  const payments = await paymentRepository.findByOrderId(orderId);

  return (
    payments.find((payment) => payment.provider === "MANUAL_CARD_TRANSFER") ??
    null
  );
}
