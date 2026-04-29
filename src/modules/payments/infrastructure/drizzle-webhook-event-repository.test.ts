import { DrizzleWebhookEventRepository } from "@/modules/payments/infrastructure/drizzle-webhook-event-repository";

const now = new Date("2026-04-30T12:00:00.000Z");
const webhookEvent = {
  eventType: "success",
  externalEventId: "invoice-1:success:2026-04-30T12:00:00.000Z",
  id: "event-1",
  payload: { invoiceId: "invoice-1" },
  processedAt: null,
  provider: "MONOBANK",
  providerModifiedAt: now,
  receivedAt: now,
} as const;

describe("DrizzleWebhookEventRepository", () => {
  it("saves new webhook events idempotently", async () => {
    const returning = vi.fn(async () => [webhookEvent]);
    const onConflictDoNothing = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const db = {
      insert: vi.fn(() => ({ values })),
    };
    const repository = new DrizzleWebhookEventRepository(db as never);

    await expect(
      repository.saveIfNew({
        eventType: "success",
        externalEventId: "invoice-1:success:2026-04-30T12:00:00.000Z",
        payload: { invoiceId: "invoice-1" },
        provider: "MONOBANK",
        providerModifiedAt: now,
      }),
    ).resolves.toMatchObject({
      event: { id: "event-1" },
      inserted: true,
    });
  });

  it("returns existing events when an idempotency conflict occurs", async () => {
    const returning = vi.fn(async () => []);
    const onConflictDoNothing = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const selectChain = {
      from: vi.fn(() => selectChain),
      limit: vi.fn(async () => [webhookEvent]),
      where: vi.fn(() => selectChain),
    };
    const db = {
      insert: vi.fn(() => ({ values })),
      select: vi.fn(() => selectChain),
    };
    const repository = new DrizzleWebhookEventRepository(db as never);

    await expect(
      repository.saveIfNew({
        eventType: "success",
        externalEventId: "invoice-1:success:2026-04-30T12:00:00.000Z",
        payload: { invoiceId: "invoice-1" },
        provider: "MONOBANK",
        providerModifiedAt: now,
      }),
    ).resolves.toMatchObject({
      event: { id: "event-1" },
      inserted: false,
    });
  });

  it("marks webhook events as processed", async () => {
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    const db = {
      update: vi.fn(() => ({ set })),
    };
    const repository = new DrizzleWebhookEventRepository(db as never);

    await repository.markProcessed("event-1", now);

    expect(set).toHaveBeenCalledWith({ processedAt: now });
  });
});
