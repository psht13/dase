import { and, asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  OrderTagRecord,
  OrderTagRepository,
} from "@/modules/orders/application/order-tag-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbOrderTag = typeof schema.orderTags.$inferSelect;

export class DrizzleOrderTagRepository implements OrderTagRepository {
  constructor(private readonly db: Database) {}

  async findByIdForOwner(
    tagId: string,
    ownerId: string,
  ): Promise<OrderTagRecord | null> {
    const [tag] = await this.db
      .select()
      .from(schema.orderTags)
      .where(
        and(eq(schema.orderTags.id, tagId), eq(schema.orderTags.ownerId, ownerId)),
      )
      .limit(1);

    return tag ? mapOrderTag(tag) : null;
  }

  async findByNameForOwner(
    name: string,
    ownerId: string,
  ): Promise<OrderTagRecord | null> {
    const [tag] = await this.db
      .select()
      .from(schema.orderTags)
      .where(
        and(
          eq(schema.orderTags.name, name),
          eq(schema.orderTags.ownerId, ownerId),
        ),
      )
      .limit(1);

    return tag ? mapOrderTag(tag) : null;
  }

  async linkToOrder(orderId: string, tagId: string): Promise<void> {
    await this.db
      .insert(schema.orderTagLinks)
      .values({ orderId, tagId })
      .onConflictDoNothing();
  }

  async listForOrder(orderId: string): Promise<OrderTagRecord[]> {
    const rows = await this.db
      .select({ tag: schema.orderTags })
      .from(schema.orderTagLinks)
      .innerJoin(
        schema.orderTags,
        eq(schema.orderTags.id, schema.orderTagLinks.tagId),
      )
      .where(eq(schema.orderTagLinks.orderId, orderId))
      .orderBy(asc(schema.orderTags.name));

    return rows.map((row) => mapOrderTag(row.tag));
  }

  async listForOwner(ownerId: string): Promise<OrderTagRecord[]> {
    const tags = await this.db
      .select()
      .from(schema.orderTags)
      .where(eq(schema.orderTags.ownerId, ownerId))
      .orderBy(asc(schema.orderTags.name));

    return tags.map(mapOrderTag);
  }

  async save(
    tag: Omit<OrderTagRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<OrderTagRecord> {
    const [savedTag] = await this.db
      .insert(schema.orderTags)
      .values({
        color: tag.color,
        name: tag.name,
        ownerId: tag.ownerId,
      })
      .returning();

    if (!savedTag) {
      throw new Error("Failed to save order tag");
    }

    return mapOrderTag(savedTag);
  }

  async unlinkFromOrder(orderId: string, tagId: string): Promise<void> {
    await this.db
      .delete(schema.orderTagLinks)
      .where(
        and(
          eq(schema.orderTagLinks.orderId, orderId),
          eq(schema.orderTagLinks.tagId, tagId),
        ),
      );
  }
}

function mapOrderTag(tag: DbOrderTag): OrderTagRecord {
  return {
    color: tag.color,
    createdAt: tag.createdAt,
    id: tag.id,
    name: tag.name,
    ownerId: tag.ownerId,
    updatedAt: tag.updatedAt,
  };
}
