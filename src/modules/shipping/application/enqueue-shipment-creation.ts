import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { OrderRepository } from "@/modules/orders/application/order-repository";
import { assertOrderStatusTransition } from "@/modules/orders/domain/status";
import type { PaymentRepository } from "@/modules/payments/application/payment-repository";
import type { ShipmentJobQueue } from "@/modules/shipping/application/shipment-job-queue";
import type {
  ShipmentRecord,
  ShipmentRepository,
} from "@/modules/shipping/application/shipment-repository";

export type EnqueueShipmentCreationInput = {
  actorUserId?: string | null;
  orderId: string;
  requestedBy: "owner" | "system";
  requireFailedShipment?: boolean;
};

export type EnqueueShipmentCreationResult = {
  enqueued: boolean;
  jobId: string | null;
  reason:
    | "already-created"
    | "enqueued"
    | "missing-order"
    | "missing-shipment"
    | "not-ready";
  shipmentId: string | null;
};

type EnqueueShipmentCreationDependencies = {
  auditEventRepository: AuditEventRepository;
  now?: () => Date;
  orderRepository: OrderRepository;
  paymentRepository: PaymentRepository;
  shipmentJobQueue: ShipmentJobQueue;
  shipmentRepository: ShipmentRepository;
};

export class ShipmentCreationRetryUnavailableError extends Error {
  constructor() {
    super("Shipment creation retry is unavailable");
    this.name = "ShipmentCreationRetryUnavailableError";
  }
}

export async function enqueueShipmentCreationForReadyOrderUseCase(
  input: EnqueueShipmentCreationInput,
  dependencies: EnqueueShipmentCreationDependencies,
): Promise<EnqueueShipmentCreationResult> {
  const order = await dependencies.orderRepository.findById(input.orderId);

  if (!order) {
    return {
      enqueued: false,
      jobId: null,
      reason: "missing-order",
      shipmentId: null,
    };
  }

  const [payments, shipments] = await Promise.all([
    dependencies.paymentRepository.findByOrderId(order.id),
    dependencies.shipmentRepository.findByOrderId(order.id),
  ]);
  const shipment = selectShipmentForCreation(
    shipments,
    input.requireFailedShipment ?? false,
  );

  if (!shipment) {
    if (input.requireFailedShipment) {
      throw new ShipmentCreationRetryUnavailableError();
    }

    return {
      enqueued: false,
      jobId: null,
      reason: "missing-shipment",
      shipmentId: null,
    };
  }

  if (shipment.status === "CREATED") {
    return {
      enqueued: false,
      jobId: null,
      reason: "already-created",
      shipmentId: shipment.id,
    };
  }

  if (!isOrderReadyForShipment(order.status, payments)) {
    if (input.requireFailedShipment) {
      throw new ShipmentCreationRetryUnavailableError();
    }

    return {
      enqueued: false,
      jobId: null,
      reason: "not-ready",
      shipmentId: shipment.id,
    };
  }

  if (order.status !== "SHIPMENT_PENDING") {
    assertOrderStatusTransition(order.status, "SHIPMENT_PENDING");
    await dependencies.orderRepository.updateStatus(
      order.id,
      "SHIPMENT_PENDING",
    );
  }

  const now = dependencies.now?.() ?? new Date();
  const jobId = await dependencies.shipmentJobQueue.enqueueCreateShipment({
    orderId: order.id,
    requestedAt: now.toISOString(),
    requestedBy: input.requestedBy,
    shipmentId: shipment.id,
  });

  await dependencies.auditEventRepository.append({
    actorCustomerId: null,
    actorType: input.requestedBy === "owner" ? "OWNER" : "SYSTEM",
    actorUserId: input.requestedBy === "owner" ? input.actorUserId ?? null : null,
    eventType: "SHIPMENT_CREATION_ENQUEUED",
    orderId: order.id,
    payload: {
      jobId,
      message: "Створення відправлення додано в чергу",
      shipmentId: shipment.id,
      status: "SHIPMENT_PENDING",
    },
  });

  return {
    enqueued: true,
    jobId,
    reason: "enqueued",
    shipmentId: shipment.id,
  };
}

function selectShipmentForCreation(
  shipments: ShipmentRecord[],
  requireFailedShipment: boolean,
): ShipmentRecord | null {
  if (requireFailedShipment) {
    return shipments.find((shipment) => shipment.status === "FAILED") ?? null;
  }

  return (
    shipments.find((shipment) => shipment.status === "PENDING") ??
    shipments.find((shipment) => shipment.status === "FAILED") ??
    shipments.find((shipment) => shipment.status === "CREATED") ??
    null
  );
}

function isOrderReadyForShipment(
  orderStatus: string,
  payments: Awaited<ReturnType<PaymentRepository["findByOrderId"]>>,
): boolean {
  if (orderStatus === "SHIPMENT_PENDING") {
    return true;
  }

  const hasPaidMonoPay = payments.some(
    (payment) => payment.provider === "MONOBANK" && payment.status === "PAID",
  );
  const hasCashOnDelivery = payments.some(
    (payment) =>
      payment.provider === "CASH_ON_DELIVERY" && payment.status === "PENDING",
  );

  return (
    (orderStatus === "PAID" && hasPaidMonoPay) ||
    (orderStatus === "CONFIRMED_BY_CUSTOMER" && hasCashOnDelivery)
  );
}
