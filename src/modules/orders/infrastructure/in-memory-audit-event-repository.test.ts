import { InMemoryAuditEventRepository } from "@/modules/orders/infrastructure/in-memory-audit-event-repository";

describe("InMemoryAuditEventRepository", () => {
  it("appends and lists audit events for an order", async () => {
    const repository = new InMemoryAuditEventRepository();

    await repository.append({
      actorCustomerId: null,
      actorType: "OWNER",
      actorUserId: "owner-1",
      eventType: "ORDER_CREATED",
      orderId: "order-1",
      payload: {
        totalMinor: 1_200_00,
      },
    });
    await repository.append({
      actorCustomerId: null,
      actorType: "SYSTEM",
      actorUserId: null,
      eventType: "OTHER_ORDER_EVENT",
      orderId: "order-2",
      payload: {},
    });

    await expect(repository.listForOrder("order-1")).resolves.toEqual([
      expect.objectContaining({
        actorType: "OWNER",
        eventType: "ORDER_CREATED",
        orderId: "order-1",
      }),
    ]);
  });
});
