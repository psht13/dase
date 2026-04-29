import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  SaveWebhookEventResult,
  WebhookEventRecord,
  WebhookEventRepository,
} from "@/modules/payments/application/webhook-event-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbWebhookEvent = typeof schema.webhookEvents.$inferSelect;

export class DrizzleWebhookEventRepository
  implements WebhookEventRepository
{
  constructor(private readonly db: Database) {}

  async markProcessed(id: string, processedAt: Date): Promise<void> {
    await this.db
      .update(schema.webhookEvents)
      .set({ processedAt })
      .where(eq(schema.webhookEvents.id, id));
  }

  async saveIfNew(
    event: Omit<WebhookEventRecord, "id" | "processedAt" | "receivedAt">,
  ): Promise<SaveWebhookEventResult> {
    const [insertedEvent] = await this.db
      .insert(schema.webhookEvents)
      .values({
        eventType: event.eventType,
        externalEventId: event.externalEventId,
        payload: event.payload,
        provider: event.provider,
        providerModifiedAt: event.providerModifiedAt,
      })
      .onConflictDoNothing({
        target: [
          schema.webhookEvents.provider,
          schema.webhookEvents.externalEventId,
        ],
      })
      .returning();

    if (insertedEvent) {
      return {
        event: mapWebhookEvent(insertedEvent),
        inserted: true,
      };
    }

    const [existingEvent] = await this.db
      .select()
      .from(schema.webhookEvents)
      .where(
        and(
          eq(schema.webhookEvents.provider, event.provider),
          eq(schema.webhookEvents.externalEventId, event.externalEventId),
        ),
      )
      .limit(1);

    if (!existingEvent) {
      throw new Error("Failed to save webhook event");
    }

    return {
      event: mapWebhookEvent(existingEvent),
      inserted: false,
    };
  }
}

function mapWebhookEvent(event: DbWebhookEvent): WebhookEventRecord {
  return {
    eventType: event.eventType,
    externalEventId: event.externalEventId,
    id: event.id,
    payload: event.payload,
    processedAt: event.processedAt,
    provider: event.provider,
    providerModifiedAt: event.providerModifiedAt,
    receivedAt: event.receivedAt,
  };
}
