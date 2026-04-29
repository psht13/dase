import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { OrderRepository } from "@/modules/orders/application/order-repository";
import {
  assertOrderStatusTransition,
  isOrderStatus,
  type OrderStatus,
} from "@/modules/orders/domain/status";

type UpdateOwnerOrderStatusDependencies = {
  auditEventRepository: AuditEventRepository;
  orderRepository: OrderRepository;
};

export class OwnerOrderStatusUpdateNotFoundError extends Error {
  constructor() {
    super("Owner order was not found for status update");
    this.name = "OwnerOrderStatusUpdateNotFoundError";
  }
}

export class OwnerOrderStatusUpdateInvalidStatusError extends Error {
  constructor() {
    super("Owner order status update target is invalid");
    this.name = "OwnerOrderStatusUpdateInvalidStatusError";
  }
}

export class OwnerOrderStatusUpdateNotAllowedError extends Error {
  constructor() {
    super("Owner order status update is not allowed");
    this.name = "OwnerOrderStatusUpdateNotAllowedError";
  }
}

export async function updateOwnerOrderStatusUseCase(
  input: {
    nextStatus: string;
    orderId: string;
    ownerId: string;
  },
  dependencies: UpdateOwnerOrderStatusDependencies,
): Promise<{
  fromStatus: OrderStatus;
  orderId: string;
  toStatus: OrderStatus;
}> {
  if (!isOrderStatus(input.nextStatus)) {
    throw new OwnerOrderStatusUpdateInvalidStatusError();
  }

  const order = await dependencies.orderRepository.findById(input.orderId);

  if (!order || order.ownerId !== input.ownerId) {
    throw new OwnerOrderStatusUpdateNotFoundError();
  }

  try {
    assertOrderStatusTransition(order.status, input.nextStatus);
  } catch {
    throw new OwnerOrderStatusUpdateNotAllowedError();
  }

  if (order.status !== input.nextStatus) {
    await dependencies.orderRepository.updateStatus(order.id, input.nextStatus);
    await dependencies.auditEventRepository.append({
      actorCustomerId: null,
      actorType: "OWNER",
      actorUserId: input.ownerId,
      eventType: "ORDER_STATUS_UPDATED",
      orderId: order.id,
      payload: {
        fromStatus: order.status,
        message: "Статус замовлення змінено вручну",
        status: input.nextStatus,
        toStatus: input.nextStatus,
      },
    });
  }

  return {
    fromStatus: order.status,
    orderId: order.id,
    toStatus: input.nextStatus,
  };
}
