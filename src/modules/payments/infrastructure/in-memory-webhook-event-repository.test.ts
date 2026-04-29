import { InMemoryWebhookEventRepository } from "@/modules/payments/infrastructure/in-memory-webhook-event-repository";

describe("InMemoryWebhookEventRepository", () => {
  it("stores webhook events only once by provider and external id", async () => {
    const repository = new InMemoryWebhookEventRepository();
    const event = {
      eventType: "success",
      externalEventId: "invoice-1:success:2026-04-30T12:00:00.000Z",
      payload: { invoiceId: "invoice-1" },
      provider: "MONOBANK" as const,
      providerModifiedAt: new Date("2026-04-30T12:00:00.000Z"),
    };

    const firstResult = await repository.saveIfNew(event);
    const secondResult = await repository.saveIfNew(event);

    expect(firstResult.inserted).toBe(true);
    expect(secondResult.inserted).toBe(false);
    expect(secondResult.event.id).toBe(firstResult.event.id);
  });
});
