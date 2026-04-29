export type WebhookProvider = "MONOBANK" | "NOVA_POSHTA" | "UKRPOSHTA";

export type WebhookEventRecord = {
  eventType: string;
  externalEventId: string;
  id: string;
  payload: Record<string, unknown>;
  processedAt: Date | null;
  provider: WebhookProvider;
  providerModifiedAt: Date | null;
  receivedAt: Date;
};

export interface WebhookEventRepository {
  markProcessed(id: string, processedAt: Date): Promise<void>;
  saveIfNew(
    event: Omit<WebhookEventRecord, "id" | "processedAt" | "receivedAt">,
  ): Promise<WebhookEventRecord>;
}
