import { DrizzleAuditEventRepository } from "@/modules/orders/infrastructure/drizzle-audit-event-repository";
import type * as schema from "@/shared/db/schema";

function createSelectChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    orderBy: vi.fn(async () => result),
    where: vi.fn(() => chain),
  };

  return chain;
}

describe("DrizzleAuditEventRepository", () => {
  const event = {
    actorCustomerId: null,
    actorType: "OWNER",
    actorUserId: "owner-1",
    createdAt: new Date("2026-04-30T10:00:00.000Z"),
    eventType: "ORDER_CREATED",
    id: "event-1",
    orderId: "order-1",
    payload: {
      totalMinor: 1_200_00,
    },
  } satisfies typeof schema.auditEvents.$inferSelect;

  it("appends audit events", async () => {
    const values = vi.fn(() => ({
      returning: vi.fn(async () => [event]),
    }));
    const db = {
      insert: vi.fn(() => ({ values })),
    };
    const repository = new DrizzleAuditEventRepository(db as never);

    await expect(
      repository.append({
        actorCustomerId: null,
        actorType: "OWNER",
        actorUserId: "owner-1",
        eventType: "ORDER_CREATED",
        orderId: "order-1",
        payload: {
          totalMinor: 1_200_00,
        },
      }),
    ).resolves.toMatchObject({
      eventType: "ORDER_CREATED",
      id: "event-1",
      orderId: "order-1",
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: "OWNER",
        eventType: "ORDER_CREATED",
      }),
    );
  });

  it("lists order audit events", async () => {
    const db = {
      select: vi.fn().mockReturnValue(createSelectChain([event])),
    };
    const repository = new DrizzleAuditEventRepository(db as never);

    await expect(repository.listForOrder("order-1")).resolves.toEqual([
      expect.objectContaining({
        eventType: "ORDER_CREATED",
        orderId: "order-1",
      }),
    ]);
  });
});
