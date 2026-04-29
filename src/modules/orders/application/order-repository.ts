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

export type ConfirmCustomerDeliveryInput = {
  confirmedAt: Date;
  customerId: string;
  orderId: string;
};

export interface OrderRepository {
  confirmCustomerDelivery(input: ConfirmCustomerDeliveryInput): Promise<void>;
  create(input: CreateOrderInput): Promise<PersistedOrder>;
  findById(orderId: string): Promise<PersistedOrder | null>;
  findByPublicToken(publicToken: string): Promise<PersistedOrder | null>;
  updateStatus(orderId: string, status: OrderStatus): Promise<void>;
}
