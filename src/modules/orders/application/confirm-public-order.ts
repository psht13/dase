import type { CustomerRepository } from "@/modules/orders/application/customer-repository";
import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type {
  OrderRepository,
  PersistedOrder,
} from "@/modules/orders/application/order-repository";
import { isValidPublicOrderToken } from "@/modules/orders/application/public-order-token";
import { assertOrderStatusTransition } from "@/modules/orders/domain/status";
import type { PaymentProvider } from "@/modules/payments/application/payment-repository";
import type { PaymentRepository } from "@/modules/payments/application/payment-repository";
import type {
  ShipmentCarrier,
  ShipmentRepository,
} from "@/modules/shipping/application/shipment-repository";

export type ConfirmPublicOrderInput = {
  carrier: ShipmentCarrier;
  cityId: string;
  cityName: string;
  fullName: string;
  paymentMethod: PaymentProvider;
  phone: string;
  publicToken: string;
  warehouseAddress: string | null;
  warehouseId: string;
  warehouseName: string;
};

export type ConfirmPublicOrderResult = {
  confirmedAt: Date;
  orderId: string;
  status: "CONFIRMED_BY_CUSTOMER";
};

type ConfirmPublicOrderDependencies = {
  auditEventRepository: AuditEventRepository;
  customerRepository: CustomerRepository;
  now?: () => Date;
  orderRepository: OrderRepository;
  paymentRepository: PaymentRepository;
  shipmentRepository: ShipmentRepository;
};

export class PublicOrderConfirmationUnavailableError extends Error {
  constructor() {
    super("Public order is unavailable for confirmation");
    this.name = "PublicOrderConfirmationUnavailableError";
  }
}

export class PublicOrderCannotBeConfirmedError extends Error {
  constructor(order: PersistedOrder) {
    super(`Public order cannot be confirmed from status ${order.status}`);
    this.name = "PublicOrderCannotBeConfirmedError";
  }
}

export async function confirmPublicOrderUseCase(
  input: ConfirmPublicOrderInput,
  dependencies: ConfirmPublicOrderDependencies,
): Promise<ConfirmPublicOrderResult> {
  if (!isValidPublicOrderToken(input.publicToken)) {
    throw new PublicOrderConfirmationUnavailableError();
  }

  const order = await dependencies.orderRepository.findByPublicToken(
    input.publicToken,
  );

  if (!order || order.status === "CANCELLED") {
    throw new PublicOrderConfirmationUnavailableError();
  }

  const now = dependencies.now?.() ?? new Date();

  if (order.publicTokenExpiresAt.getTime() <= now.getTime()) {
    throw new PublicOrderConfirmationUnavailableError();
  }

  if (order.status !== "SENT_TO_CUSTOMER") {
    throw new PublicOrderCannotBeConfirmedError(order);
  }

  assertOrderStatusTransition(order.status, "CONFIRMED_BY_CUSTOMER");

  const customer = await dependencies.customerRepository.save({
    fullName: input.fullName,
    phone: input.phone,
  });

  await dependencies.orderRepository.confirmCustomerDelivery({
    confirmedAt: now,
    customerId: customer.id,
    orderId: order.id,
  });

  await dependencies.paymentRepository.save({
    amountMinor: order.totalMinor,
    currency: order.currency,
    failureReason: null,
    orderId: order.id,
    paidAt: null,
    provider: input.paymentMethod,
    providerInvoiceId: null,
    providerModifiedAt: null,
    status: "PENDING",
  });

  await dependencies.shipmentRepository.save({
    addressText: formatAddressText(input),
    carrier: input.carrier,
    carrierOfficeId: input.warehouseId,
    carrierPayload: {
      cityName: input.cityName,
      paymentMethod: input.paymentMethod,
      warehouseAddress: input.warehouseAddress,
      warehouseName: input.warehouseName,
    },
    carrierShipmentId: null,
    cityName: input.cityName,
    cityRef: input.cityId,
    deliveredAt: null,
    labelUrl: null,
    orderId: order.id,
    recipientCustomerId: customer.id,
    status: "PENDING",
    trackingNumber: null,
  });

  await dependencies.auditEventRepository.append({
    actorCustomerId: customer.id,
    actorType: "CUSTOMER",
    actorUserId: null,
    eventType: "ORDER_CONFIRMED_BY_CUSTOMER",
    orderId: order.id,
    payload: {
      carrier: input.carrier,
      cityName: input.cityName,
      paymentMethod: input.paymentMethod,
      status: "CONFIRMED_BY_CUSTOMER",
      warehouseName: input.warehouseName,
    },
  });

  return {
    confirmedAt: now,
    orderId: order.id,
    status: "CONFIRMED_BY_CUSTOMER",
  };
}

function formatAddressText(input: ConfirmPublicOrderInput): string {
  return [input.cityName, input.warehouseName, input.warehouseAddress]
    .filter(Boolean)
    .join(", ");
}
