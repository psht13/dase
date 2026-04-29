import { InMemoryOrderRepository } from "@/modules/orders/infrastructure/in-memory-order-repository";

describe("InMemoryOrderRepository", () => {
  it("stores orders by public token and updates status", async () => {
    const repository = new InMemoryOrderRepository();
    const order = await repository.create({
      items: [
        {
          lineTotalMinor: 1_200_00,
          productId: "product-1",
          productImageUrlsSnapshot: ["https://example.com/ring.jpg"],
          productNameSnapshot: "Каблучка",
          productSkuSnapshot: "RING-1",
          quantity: 1,
          unitPriceMinor: 1_200_00,
        },
      ],
      ownerId: "owner-1",
      publicToken: "secure-token",
      publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
      sentAt: new Date("2026-04-30T10:00:00.000Z"),
      status: "SENT_TO_CUSTOMER",
      totalMinor: 1_200_00,
    });

    await expect(
      repository.findById(order.id),
    ).resolves.toMatchObject({
      id: order.id,
      status: "SENT_TO_CUSTOMER",
    });

    await expect(
      repository.findByPublicToken("secure-token"),
    ).resolves.toMatchObject({
      id: order.id,
      items: [{ productNameSnapshot: "Каблучка" }],
      status: "SENT_TO_CUSTOMER",
    });
    await expect(repository.listByOwnerId("owner-1")).resolves.toEqual([
      expect.objectContaining({ id: order.id }),
    ]);

    await repository.updateStatus(order.id, "CANCELLED");

    await expect(
      repository.findByPublicToken("secure-token"),
    ).resolves.toMatchObject({
      status: "CANCELLED",
    });
  });
});
