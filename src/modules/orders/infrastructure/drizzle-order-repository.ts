import { asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  CreateOrderInput,
  OrderRepository,
  PersistedOrder,
  PersistedOrderItem,
} from "@/modules/orders/application/order-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbOrder = typeof schema.orders.$inferSelect;
type DbOrderItem = typeof schema.orderItems.$inferSelect;

export class DrizzleOrderRepository implements OrderRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateOrderInput): Promise<PersistedOrder> {
    return this.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(schema.orders)
        .values({
          currency: input.currency ?? "UAH",
          customerId: input.customerId ?? null,
          ownerId: input.ownerId,
          publicToken: input.publicToken,
          status: input.status ?? "DRAFT",
          totalMinor: input.totalMinor,
        })
        .returning();

      if (!order) {
        throw new Error("Failed to save order");
      }

      const items = input.items.length
        ? await tx
            .insert(schema.orderItems)
            .values(
              input.items.map((item) => ({
                lineTotalMinor: item.lineTotalMinor,
                orderId: order.id,
                productId: item.productId,
                productNameSnapshot: item.productNameSnapshot,
                productSkuSnapshot: item.productSkuSnapshot,
                quantity: item.quantity,
                unitPriceMinor: item.unitPriceMinor,
              })),
            )
            .returning()
        : [];

      return mapOrder(order, items);
    });
  }

  async findByPublicToken(publicToken: string): Promise<PersistedOrder | null> {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.publicToken, publicToken))
      .limit(1);

    if (!order) {
      return null;
    }

    const items = await this.db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id))
      .orderBy(asc(schema.orderItems.createdAt));

    return mapOrder(order, items);
  }

  async updateStatus(
    orderId: string,
    status: PersistedOrder["status"],
  ): Promise<void> {
    await this.db
      .update(schema.orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.orders.id, orderId));
  }
}

function mapOrder(order: DbOrder, items: readonly DbOrderItem[]): PersistedOrder {
  return {
    confirmedAt: order.confirmedAt,
    createdAt: order.createdAt,
    currency: order.currency,
    customerId: order.customerId,
    id: order.id,
    items: items.map(mapOrderItem),
    ownerId: order.ownerId,
    publicToken: order.publicToken,
    sentAt: order.sentAt,
    status: order.status,
    totalMinor: order.totalMinor,
    updatedAt: order.updatedAt,
  };
}

function mapOrderItem(item: DbOrderItem): PersistedOrderItem {
  return {
    createdAt: item.createdAt,
    id: item.id,
    lineTotalMinor: item.lineTotalMinor,
    orderId: item.orderId,
    productId: item.productId,
    productNameSnapshot: item.productNameSnapshot,
    productSkuSnapshot: item.productSkuSnapshot,
    quantity: item.quantity,
    unitPriceMinor: item.unitPriceMinor,
  };
}
