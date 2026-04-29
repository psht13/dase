import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { OrderRepository } from "@/modules/orders/application/order-repository";
import { assertOrderStatusTransition } from "@/modules/orders/domain/status";
import type { AutoCompleteDeliveredOrderJobData } from "@/modules/shipping/application/shipment-job-queue";
import type { ShipmentRepository } from "@/modules/shipping/application/shipment-repository";

type AutoCompleteDeliveredOrderDependencies = {
  auditEventRepository: AuditEventRepository;
  autoCompleteAfterDeliveredHours: number;
  now?: () => Date;
  orderRepository: OrderRepository;
  shipmentRepository: ShipmentRepository;
};

export type AutoCompleteDeliveredOrderResult = {
  completed: boolean;
  reason: "completed" | "not-delivered" | "too-early";
};

export async function autoCompleteDeliveredOrderJobUseCase(
  input: AutoCompleteDeliveredOrderJobData,
  dependencies: AutoCompleteDeliveredOrderDependencies,
): Promise<AutoCompleteDeliveredOrderResult> {
  const [order, shipments] = await Promise.all([
    dependencies.orderRepository.findById(input.orderId),
    dependencies.shipmentRepository.findByOrderId(input.orderId),
  ]);
  const shipment =
    shipments.find((candidate) => candidate.id === input.shipmentId) ?? null;

  if (!order || !shipment || order.status !== "DELIVERED") {
    return { completed: false, reason: "not-delivered" };
  }

  const deliveredAt = shipment.deliveredAt ?? new Date(input.deliveredAt);

  if (Number.isNaN(deliveredAt.getTime()) || shipment.status !== "DELIVERED") {
    return { completed: false, reason: "not-delivered" };
  }

  const now = dependencies.now?.() ?? new Date();
  const completeAfter =
    deliveredAt.getTime() +
    dependencies.autoCompleteAfterDeliveredHours * 60 * 60 * 1000;

  if (now.getTime() < completeAfter) {
    return { completed: false, reason: "too-early" };
  }

  assertOrderStatusTransition(order.status, "COMPLETED");
  await dependencies.orderRepository.updateStatus(order.id, "COMPLETED");
  await dependencies.auditEventRepository.append({
    actorCustomerId: null,
    actorType: "SYSTEM",
    actorUserId: null,
    eventType: "ORDER_AUTO_COMPLETED",
    orderId: order.id,
    payload: {
      deliveredAt: deliveredAt.toISOString(),
      message: "Доставлене замовлення автоматично завершено",
      status: "COMPLETED",
    },
  });

  return { completed: true, reason: "completed" };
}
