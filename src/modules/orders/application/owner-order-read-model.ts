import type {
  AuditEventRecord,
  AuditEventRepository,
} from "@/modules/orders/application/audit-event-repository";
import type {
  CustomerRecord,
  CustomerRepository,
} from "@/modules/orders/application/customer-repository";
import type {
  OrderRepository,
  PersistedOrder,
  PersistedOrderItem,
} from "@/modules/orders/application/order-repository";
import type {
  OrderTagRecord,
  OrderTagRepository,
} from "@/modules/orders/application/order-tag-repository";
import { isOrderStatus, type OrderStatus } from "@/modules/orders/domain/status";
import type {
  PaymentProviderCode,
  PaymentRecord,
  PaymentRepository,
} from "@/modules/payments/application/payment-repository";
import type {
  ShipmentCarrier,
  ShipmentRecord,
  ShipmentRepository,
} from "@/modules/shipping/application/shipment-repository";

export type OwnerOrderFilters = {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  deliveryCarrier?: ShipmentCarrier | null;
  paymentMethod?: PaymentProviderCode | null;
  search?: string | null;
  status?: OrderStatus | null;
  tagId?: string | null;
};

export type OwnerOrderSummary = {
  confirmedAt: Date | null;
  createdAt: Date;
  currency: string;
  customer: CustomerRecord | null;
  id: string;
  payments: PaymentRecord[];
  shipments: ShipmentRecord[];
  status: OrderStatus;
  tags: OrderTagRecord[];
  totalMinor: number;
  updatedAt: Date;
};

export type OwnerOrderStatusHistoryEntry = {
  actorType: AuditEventRecord["actorType"];
  createdAt: Date;
  eventType: string;
  id: string;
  status: OrderStatus;
};

export type OwnerOrderDetails = OwnerOrderSummary & {
  auditEvents: AuditEventRecord[];
  items: PersistedOrderItem[];
  publicToken: string;
  publicTokenExpiresAt: Date;
  sentAt: Date | null;
  statusHistory: OwnerOrderStatusHistoryEntry[];
};

export type OwnerOrderReadDependencies = {
  auditEventRepository: AuditEventRepository;
  customerRepository: CustomerRepository;
  orderRepository: OrderRepository;
  orderTagRepository: OrderTagRepository;
  paymentRepository: PaymentRepository;
  shipmentRepository: ShipmentRepository;
};

export class OwnerOrderNotFoundError extends Error {
  constructor() {
    super("Owner order was not found");
    this.name = "OwnerOrderNotFoundError";
  }
}

export async function listOwnerOrdersUseCase(
  input: {
    filters?: OwnerOrderFilters;
    ownerId: string;
  },
  dependencies: Omit<OwnerOrderReadDependencies, "auditEventRepository">,
): Promise<OwnerOrderSummary[]> {
  const orders = await dependencies.orderRepository.listByOwnerId(input.ownerId);
  const summaries = await Promise.all(
    orders.map((order) => buildOwnerOrderSummary(order, dependencies)),
  );
  const filters = input.filters ?? {};

  return summaries
    .filter((order) => matchesFilters(order, filters))
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
}

export async function getOwnerOrderDetailsUseCase(
  input: {
    orderId: string;
    ownerId: string;
  },
  dependencies: OwnerOrderReadDependencies,
): Promise<OwnerOrderDetails | null> {
  const order = await dependencies.orderRepository.findById(input.orderId);

  if (!order || order.ownerId !== input.ownerId) {
    return null;
  }

  const [summary, auditEvents] = await Promise.all([
    buildOwnerOrderSummary(order, dependencies),
    dependencies.auditEventRepository.listForOrder(order.id),
  ]);

  return {
    ...summary,
    auditEvents,
    items: order.items,
    publicToken: order.publicToken,
    publicTokenExpiresAt: order.publicTokenExpiresAt,
    sentAt: order.sentAt,
    statusHistory: buildStatusHistory(order, auditEvents),
  };
}

export async function listOwnerOrderTagsUseCase(
  input: {
    ownerId: string;
  },
  dependencies: {
    orderTagRepository: OrderTagRepository;
  },
): Promise<OrderTagRecord[]> {
  return dependencies.orderTagRepository.listForOwner(input.ownerId);
}

async function buildOwnerOrderSummary(
  order: PersistedOrder,
  dependencies: Pick<
    OwnerOrderReadDependencies,
    | "customerRepository"
    | "orderTagRepository"
    | "paymentRepository"
    | "shipmentRepository"
  >,
): Promise<OwnerOrderSummary> {
  const [customer, payments, shipments, tags] = await Promise.all([
    order.customerId
      ? dependencies.customerRepository.findById(order.customerId)
      : Promise.resolve(null),
    dependencies.paymentRepository.findByOrderId(order.id),
    dependencies.shipmentRepository.findByOrderId(order.id),
    dependencies.orderTagRepository.listForOrder(order.id),
  ]);

  return {
    confirmedAt: order.confirmedAt,
    createdAt: order.createdAt,
    currency: order.currency,
    customer,
    id: order.id,
    payments,
    shipments,
    status: order.status,
    tags,
    totalMinor: order.totalMinor,
    updatedAt: order.updatedAt,
  };
}

function matchesFilters(
  order: OwnerOrderSummary,
  filters: OwnerOrderFilters,
): boolean {
  if (filters.status && order.status !== filters.status) {
    return false;
  }

  if (
    filters.deliveryCarrier &&
    !order.shipments.some(
      (shipment) => shipment.carrier === filters.deliveryCarrier,
    )
  ) {
    return false;
  }

  if (
    filters.paymentMethod &&
    !order.payments.some((payment) => payment.provider === filters.paymentMethod)
  ) {
    return false;
  }

  if (filters.tagId && !order.tags.some((tag) => tag.id === filters.tagId)) {
    return false;
  }

  if (filters.dateFrom && order.createdAt < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && order.createdAt > filters.dateTo) {
    return false;
  }

  if (filters.search && !matchesSearch(order, filters.search)) {
    return false;
  }

  return true;
}

function matchesSearch(order: OwnerOrderSummary, rawSearch: string): boolean {
  const search = rawSearch.trim().toLowerCase();

  if (!search) {
    return true;
  }

  const searchDigits = onlyDigits(search);
  const phone = order.customer?.phone ?? "";
  const phoneDigits = onlyDigits(phone);
  const trackingNumbers = order.shipments
    .map((shipment) => shipment.trackingNumber ?? "")
    .filter(Boolean);

  return (
    (searchDigits.length > 0 && phoneDigits.includes(searchDigits)) ||
    trackingNumbers.some((trackingNumber) =>
      trackingNumber.toLowerCase().includes(search),
    )
  );
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function buildStatusHistory(
  order: PersistedOrder,
  auditEvents: AuditEventRecord[],
): OwnerOrderStatusHistoryEntry[] {
  const history = auditEvents.flatMap((event) => {
    const status = statusFromAuditPayload(event.payload);

    if (!status) {
      return [];
    }

    return [
      {
        actorType: event.actorType,
        createdAt: event.createdAt,
        eventType: event.eventType,
        id: event.id,
        status,
      },
    ];
  });

  if (!history.some((entry) => entry.status === order.status)) {
    history.push({
      actorType: "SYSTEM",
      createdAt: order.updatedAt,
      eventType: "CURRENT_STATUS",
      id: `${order.id}:current-status`,
      status: order.status,
    });
  }

  return history.sort(
    (first, second) => first.createdAt.getTime() - second.createdAt.getTime(),
  );
}

function statusFromAuditPayload(
  payload: Record<string, unknown>,
): OrderStatus | null {
  const status = payload.status ?? payload.toStatus;

  return typeof status === "string" && isOrderStatus(status) ? status : null;
}
