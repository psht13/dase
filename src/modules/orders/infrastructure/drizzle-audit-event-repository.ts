import { asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  AuditEventRecord,
  AuditEventRepository,
} from "@/modules/orders/application/audit-event-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbAuditEvent = typeof schema.auditEvents.$inferSelect;

export class DrizzleAuditEventRepository implements AuditEventRepository {
  constructor(private readonly db: Database) {}

  async append(
    event: Omit<AuditEventRecord, "createdAt" | "id">,
  ): Promise<AuditEventRecord> {
    const [savedEvent] = await this.db
      .insert(schema.auditEvents)
      .values({
        actorCustomerId: event.actorCustomerId,
        actorType: event.actorType,
        actorUserId: event.actorUserId,
        eventType: event.eventType,
        orderId: event.orderId,
        payload: event.payload,
      })
      .returning();

    if (!savedEvent) {
      throw new Error("Failed to save audit event");
    }

    return mapAuditEvent(savedEvent);
  }

  async listForOrder(orderId: string): Promise<AuditEventRecord[]> {
    const events = await this.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.orderId, orderId))
      .orderBy(asc(schema.auditEvents.createdAt));

    return events.map(mapAuditEvent);
  }
}

function mapAuditEvent(event: DbAuditEvent): AuditEventRecord {
  return {
    actorCustomerId: event.actorCustomerId,
    actorType: event.actorType,
    actorUserId: event.actorUserId,
    createdAt: event.createdAt,
    eventType: event.eventType,
    id: event.id,
    orderId: event.orderId,
    payload: event.payload,
  };
}
