import { DrizzleOrderRepository } from "./drizzle-order-repository";
import type * as schema from "@/shared/db/schema";

function createSelectChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    limit: vi.fn(async () => result),
    orderBy: vi.fn(async () => result),
    where: vi.fn(() => chain),
  };

  return chain;
}

describe("DrizzleOrderRepository", () => {
  const now = new Date("2026-04-30T00:00:00.000Z");
  const order = {
    confirmedAt: null,
    createdAt: now,
    currency: "UAH",
    customerId: null,
    id: "order-1",
    ownerId: "owner-1",
    publicToken: "public-token",
    publicTokenExpiresAt: new Date("2026-05-14T00:00:00.000Z"),
    sentAt: null,
    status: "DRAFT",
    totalMinor: 240_00,
    updatedAt: now,
  } satisfies typeof schema.orders.$inferSelect;
  const item = {
    createdAt: now,
    id: "item-1",
    lineTotalMinor: 240_00,
    orderId: "order-1",
    productId: "product-1",
    productImageUrlsSnapshot: ["https://example.com/ring.jpg"],
    productNameSnapshot: "Каблучка",
    productSkuSnapshot: "RING-1",
    quantity: 2,
    unitPriceMinor: 120_00,
  } satisfies typeof schema.orderItems.$inferSelect;

  it("creates an order and item rows in one transaction", async () => {
    const orderInsert = {
      values: vi.fn(() => ({
        returning: vi.fn(async () => [order]),
      })),
    };
    const itemInsert = {
      values: vi.fn(() => ({
        returning: vi.fn(async () => [item]),
      })),
    };
    const transactionDb = {
      insert: vi
        .fn()
        .mockReturnValueOnce(orderInsert)
        .mockReturnValueOnce(itemInsert),
    };
    const db = {
      transaction: vi.fn(
        async (
          callback: (
            tx: typeof transactionDb,
          ) => unknown | Promise<unknown>,
        ) => callback(transactionDb),
      ),
    };
    const repository = new DrizzleOrderRepository(db as never);

    const savedOrder = await repository.create({
      items: [
        {
          lineTotalMinor: 240_00,
          productId: "product-1",
          productImageUrlsSnapshot: ["https://example.com/ring.jpg"],
          productNameSnapshot: "Каблучка",
          productSkuSnapshot: "RING-1",
          quantity: 2,
          unitPriceMinor: 120_00,
        },
      ],
      ownerId: "owner-1",
      publicToken: "public-token",
      publicTokenExpiresAt: new Date("2026-05-14T00:00:00.000Z"),
      totalMinor: 240_00,
    });

    expect(orderInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "owner-1", totalMinor: 240_00 }),
    );
    expect(itemInsert.values).toHaveBeenCalledWith([
      expect.objectContaining({
        orderId: "order-1",
        productNameSnapshot: "Каблучка",
      }),
    ]);
    expect(savedOrder.items).toEqual([
      expect.objectContaining({ id: "item-1", lineTotalMinor: 240_00 }),
    ]);
  });

  it("finds orders by public token with item snapshots", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectChain([order]))
        .mockReturnValueOnce(createSelectChain([item])),
    };
    const repository = new DrizzleOrderRepository(db as never);

    await expect(
      repository.findByPublicToken("public-token"),
    ).resolves.toMatchObject({
      id: "order-1",
      items: [{ productNameSnapshot: "Каблучка" }],
    });
  });

  it("returns null when public token is missing", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(createSelectChain([])),
    };
    const repository = new DrizzleOrderRepository(db as never);

    await expect(repository.findByPublicToken("missing")).resolves.toBeNull();
  });

  it("updates order status", async () => {
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    const db = {
      update: vi.fn(() => ({ set })),
    };
    const repository = new DrizzleOrderRepository(db as never);

    await repository.updateStatus("order-1", "SENT_TO_CUSTOMER");

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SENT_TO_CUSTOMER" }),
    );
    expect(where).toHaveBeenCalled();
  });
});
