import type { OrderItemSnapshot } from "@/modules/orders/domain/order";
import type { OrderStatus } from "@/modules/orders/domain/status";

export type CreateOrderInput = {
  currency?: string;
  customerId?: string | null;
  items: OrderItemSnapshot[];
  ownerId: string;
  publicToken: string;
  publicTokenExpiresAt: Date;
  sentAt?: Date | null;
  status?: OrderStatus;
  totalMinor: number;
};

export type PersistedOrderItem = OrderItemSnapshot & {
  createdAt: Date;
  id: string;
  orderId: string;
};

export type PersistedOrder = {
  confirmedAt: Date | null;
  createdAt: Date;
  currency: string;
  customerId: string | null;
  id: string;
  items: PersistedOrderItem[];
  ownerId: string;
  publicToken: string;
  publicTokenExpiresAt: Date;
  sentAt: Date | null;
  status: OrderStatus;
  totalMinor: number;
  updatedAt: Date;
};

export interface OrderRepository {
  create(input: CreateOrderInput): Promise<PersistedOrder>;
  findByPublicToken(publicToken: string): Promise<PersistedOrder | null>;
  updateStatus(orderId: string, status: OrderStatus): Promise<void>;
}
