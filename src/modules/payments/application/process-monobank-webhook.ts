import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { OrderRepository } from "@/modules/orders/application/order-repository";
import type { OrderStatus } from "@/modules/orders/domain/status";
import { canTransitionOrderStatus } from "@/modules/orders/domain/status";
import type { PaymentProvider } from "@/modules/payments/application/payment-provider";
import type { ProviderInvoiceStatus } from "@/modules/payments/application/payment-provider";
import type {
  PaymentRecord,
  PaymentRepository,
} from "@/modules/payments/application/payment-repository";
import { mapProviderStatusToPaymentTransition } from "@/modules/payments/application/payment-status";
import type { WebhookEventRepository } from "@/modules/payments/application/webhook-event-repository";
import { enqueueShipmentCreationForReadyOrderUseCase } from "@/modules/shipping/application/enqueue-shipment-creation";
import type { ShipmentJobQueue } from "@/modules/shipping/application/shipment-job-queue";
import type { ShipmentRepository } from "@/modules/shipping/application/shipment-repository";

export type ProcessMonobankWebhookInput = {
  rawBody: Buffer | string;
  signature: string | null;
};

export type ProcessMonobankWebhookResult = {
  invoiceId: string;
  outcome: "processed" | "duplicate" | "stale" | "unknown-payment";
  paymentStatus: PaymentRecord["status"] | null;
};

type ProcessMonobankWebhookDependencies = {
  auditEventRepository: AuditEventRepository;
  now?: () => Date;
  orderRepository: OrderRepository;
  paymentProvider: PaymentProvider;
  paymentRepository: PaymentRepository;
  shipmentJobQueue: ShipmentJobQueue;
  shipmentRepository: ShipmentRepository;
  webhookEventRepository: WebhookEventRepository;
};

export async function processMonobankWebhookUseCase(
  input: ProcessMonobankWebhookInput,
  dependencies: ProcessMonobankWebhookDependencies,
): Promise<ProcessMonobankWebhookResult> {
  const invoiceStatus = await dependencies.paymentProvider.verifyWebhook(input);
  const savedEvent = await dependencies.webhookEventRepository.saveIfNew({
    eventType: invoiceStatus.rawStatus,
    externalEventId: invoiceStatus.eventId,
    payload: invoiceStatus.rawPayload,
    provider: "MONOBANK",
    providerModifiedAt: invoiceStatus.providerModifiedAt,
  });

  if (!savedEvent.inserted && savedEvent.event.processedAt) {
    return {
      invoiceId: invoiceStatus.invoiceId,
      outcome: "duplicate",
      paymentStatus: null,
    };
  }

  const payment = await dependencies.paymentRepository.findByProviderInvoiceId(
    "MONOBANK",
    invoiceStatus.invoiceId,
  );

  if (!payment) {
    await dependencies.webhookEventRepository.markProcessed(
      savedEvent.event.id,
      dependencies.now?.() ?? new Date(),
    );

    return {
      invoiceId: invoiceStatus.invoiceId,
      outcome: "unknown-payment",
      paymentStatus: null,
    };
  }

  if (isStaleProviderEvent(payment, invoiceStatus)) {
    await dependencies.webhookEventRepository.markProcessed(
      savedEvent.event.id,
      dependencies.now?.() ?? new Date(),
    );

    return {
      invoiceId: invoiceStatus.invoiceId,
      outcome: "stale",
      paymentStatus: payment.status,
    };
  }

  const transition = mapProviderStatusToPaymentTransition(
    invoiceStatus.rawStatus,
    {
      failureReason: invoiceStatus.failureReason,
      paidAt: invoiceStatus.providerModifiedAt,
    },
  );

  const updatedPayment = await dependencies.paymentRepository.updateStatus({
    failureReason: transition.failureReason,
    paidAt:
      transition.paymentStatus === "PAID"
        ? invoiceStatus.providerModifiedAt
        : payment.paidAt,
    paymentId: payment.id,
    providerModifiedAt: invoiceStatus.providerModifiedAt,
    status: transition.paymentStatus,
  });

  if (transition.orderStatus) {
    await applyOrderPaymentStatus(
      payment.orderId,
      transition.orderStatus,
      dependencies.orderRepository,
    );
  }

  if (transition.paymentStatus === "PAID") {
    await enqueueShipmentCreationForReadyOrderUseCase(
      {
        orderId: payment.orderId,
        requestedBy: "system",
      },
      dependencies,
    );
  }

  await dependencies.auditEventRepository.append({
    actorCustomerId: null,
    actorType: "SYSTEM",
    actorUserId: null,
    eventType:
      transition.paymentStatus === "PAID" ? "PAYMENT_PAID" : "PAYMENT_UPDATED",
    orderId: payment.orderId,
    payload: {
      invoiceId: invoiceStatus.invoiceId,
      paymentStatus: transition.paymentStatus,
      provider: "MONOBANK",
      providerModifiedAt: invoiceStatus.providerModifiedAt.toISOString(),
      rawStatus: invoiceStatus.rawStatus,
    },
  });

  await dependencies.webhookEventRepository.markProcessed(
    savedEvent.event.id,
    dependencies.now?.() ?? new Date(),
  );

  return {
    invoiceId: invoiceStatus.invoiceId,
    outcome: "processed",
    paymentStatus: updatedPayment.status,
  };
}

function isStaleProviderEvent(
  payment: PaymentRecord,
  invoiceStatus: ProviderInvoiceStatus,
): boolean {
  return (
    payment.providerModifiedAt !== null &&
    invoiceStatus.providerModifiedAt.getTime() <=
      payment.providerModifiedAt.getTime()
  );
}

async function applyOrderPaymentStatus(
  orderId: string,
  targetStatus: OrderStatus,
  orderRepository: OrderRepository,
): Promise<void> {
  const order = await orderRepository.findById(orderId);

  if (!order) {
    return;
  }

  const path = getOrderStatusPath(order.status, targetStatus);

  for (const status of path) {
    await orderRepository.updateStatus(orderId, status);
  }
}

function getOrderStatusPath(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
): OrderStatus[] {
  if (currentStatus === targetStatus) {
    return [];
  }

  if (canTransitionOrderStatus(currentStatus, targetStatus)) {
    return [targetStatus];
  }

  if (
    canTransitionOrderStatus(currentStatus, "PAYMENT_PENDING") &&
    canTransitionOrderStatus("PAYMENT_PENDING", targetStatus)
  ) {
    return ["PAYMENT_PENDING", targetStatus];
  }

  return [];
}
