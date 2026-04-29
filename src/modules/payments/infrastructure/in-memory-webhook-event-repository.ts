import { randomUUID } from "node:crypto";
import type {
  SaveWebhookEventResult,
  WebhookEventRecord,
  WebhookEventRepository,
} from "@/modules/payments/application/webhook-event-repository";

export class InMemoryWebhookEventRepository
  implements WebhookEventRepository
{
  private readonly events = new Map<string, WebhookEventRecord>();

  async markProcessed(id: string, processedAt: Date): Promise<void> {
    const event = this.events.get(id);

    if (!event) {
      return;
    }

    this.events.set(id, {
      ...event,
      processedAt,
    });
  }

  async saveIfNew(
    event: Omit<WebhookEventRecord, "id" | "processedAt" | "receivedAt">,
  ): Promise<SaveWebhookEventResult> {
    const existing = [...this.events.values()].find(
      (savedEvent) =>
        savedEvent.provider === event.provider &&
        savedEvent.externalEventId === event.externalEventId,
    );

    if (existing) {
      return {
        event: existing,
        inserted: false,
      };
    }

    const savedEvent: WebhookEventRecord = {
      ...event,
      id: randomUUID(),
      processedAt: null,
      receivedAt: new Date(),
    };

    this.events.set(savedEvent.id, savedEvent);

    return {
      event: savedEvent,
      inserted: true,
    };
  }
}
