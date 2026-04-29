import { randomUUID } from "node:crypto";
import type {
  CreateOrderInput,
  OrderRepository,
  PersistedOrder,
  PersistedOrderItem,
} from "@/modules/orders/application/order-repository";
import type { OrderStatus } from "@/modules/orders/domain/status";

export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, PersistedOrder>();

  async confirmCustomerDelivery(input: {
    confirmedAt: Date;
    customerId: string;
    orderId: string;
  }): Promise<void> {
    const order = this.orders.get(input.orderId);

    if (!order) {
      return;
    }

    this.orders.set(input.orderId, {
      ...order,
      confirmedAt: input.confirmedAt,
      customerId: input.customerId,
      status: "CONFIRMED_BY_CUSTOMER",
      updatedAt: new Date(),
    });
  }

  async create(input: CreateOrderInput): Promise<PersistedOrder> {
    const now = new Date();
    const orderId = randomUUID();
    const order: PersistedOrder = {
      confirmedAt: null,
      createdAt: now,
      currency: input.currency ?? "UAH",
      customerId: input.customerId ?? null,
      id: orderId,
      items: input.items.map((item) => toPersistedOrderItem(item, orderId, now)),
      ownerId: input.ownerId,
      publicToken: input.publicToken,
      publicTokenExpiresAt: input.publicTokenExpiresAt,
      sentAt: input.sentAt ?? null,
      status: input.status ?? "DRAFT",
      totalMinor: input.totalMinor,
      updatedAt: now,
    };

    this.orders.set(order.id, order);

    return order;
  }

  async findByPublicToken(publicToken: string): Promise<PersistedOrder | null> {
    return (
      [...this.orders.values()].find(
        (order) => order.publicToken === publicToken,
      ) ?? null
    );
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = this.orders.get(orderId);

    if (!order) {
      return;
    }

    this.orders.set(orderId, {
      ...order,
      status,
      updatedAt: new Date(),
    });
  }
}

function toPersistedOrderItem(
  item: CreateOrderInput["items"][number],
  orderId: string,
  createdAt: Date,
): PersistedOrderItem {
  return {
    ...item,
    createdAt,
    id: randomUUID(),
    orderId,
  };
}
