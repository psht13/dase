export const orderStatuses = [
  "DRAFT",
  "SENT_TO_CUSTOMER",
  "CONFIRMED_BY_CUSTOMER",
  "PAYMENT_PENDING",
  "PAID",
  "PAYMENT_FAILED",
  "SHIPMENT_PENDING",
  "SHIPMENT_CREATED",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
  "RETURN_REQUESTED",
  "RETURNED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

const allowedOrderStatusTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ["SENT_TO_CUSTOMER", "CANCELLED"],
  SENT_TO_CUSTOMER: ["CONFIRMED_BY_CUSTOMER", "CANCELLED"],
  CONFIRMED_BY_CUSTOMER: [
    "PAYMENT_PENDING",
    "SHIPMENT_PENDING",
    "CANCELLED",
  ],
  PAYMENT_PENDING: ["PAID", "PAYMENT_FAILED", "CANCELLED"],
  PAID: ["SHIPMENT_PENDING", "CANCELLED"],
  PAYMENT_FAILED: ["PAYMENT_PENDING", "CANCELLED"],
  SHIPMENT_PENDING: ["SHIPMENT_CREATED", "CANCELLED"],
  SHIPMENT_CREATED: ["IN_TRANSIT", "DELIVERED", "RETURN_REQUESTED"],
  IN_TRANSIT: ["DELIVERED", "RETURN_REQUESTED"],
  DELIVERED: ["COMPLETED", "RETURN_REQUESTED"],
  COMPLETED: [],
  RETURN_REQUESTED: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
};

export function isOrderStatus(value: string): value is OrderStatus {
  return orderStatuses.includes(value as OrderStatus);
}

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  return allowedOrderStatusTransitions[currentStatus].includes(nextStatus);
}

export function assertOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): void {
  if (!canTransitionOrderStatus(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid order status transition from ${currentStatus} to ${nextStatus}`,
    );
  }
}
