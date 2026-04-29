import { DrizzleOrderTagRepository } from "@/modules/orders/infrastructure/drizzle-order-tag-repository";
import type * as schema from "@/shared/db/schema";

function createSelectChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    limit: vi.fn(async () => result),
    orderBy: vi.fn(async () => result),
    where: vi.fn(() => chain),
  };

  return chain;
}

describe("DrizzleOrderTagRepository", () => {
  const now = new Date("2026-04-30T10:00:00.000Z");
  const tag = {
    color: null,
    createdAt: now,
    id: "tag-1",
    name: "Подарунок",
    ownerId: "owner-1",
    updatedAt: now,
  } satisfies typeof schema.orderTags.$inferSelect;

  it("saves and lists owner tags", async () => {
    const db = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [tag]),
        })),
      })),
      select: vi.fn(() => createSelectChain([tag])),
    };
    const repository = new DrizzleOrderTagRepository(db as never);

    await expect(
      repository.save({
        color: null,
        name: "Подарунок",
        ownerId: "owner-1",
      }),
    ).resolves.toMatchObject({ id: "tag-1" });
    await expect(repository.listForOwner("owner-1")).resolves.toEqual([
      expect.objectContaining({ name: "Подарунок" }),
    ]);
  });

  it("links and unlinks tags idempotently", async () => {
    const onConflictDoNothing = vi.fn(async () => undefined);
    const insertValues = vi.fn(() => ({ onConflictDoNothing }));
    const deleteWhere = vi.fn(async () => undefined);
    const deleteChain = { where: deleteWhere };
    const db = {
      delete: vi.fn(() => deleteChain),
      insert: vi.fn(() => ({ values: insertValues })),
    };
    const repository = new DrizzleOrderTagRepository(db as never);

    await repository.linkToOrder("order-1", "tag-1");
    await repository.unlinkFromOrder("order-1", "tag-1");

    expect(insertValues).toHaveBeenCalledWith({
      orderId: "order-1",
      tagId: "tag-1",
    });
    expect(onConflictDoNothing).toHaveBeenCalled();
    expect(deleteWhere).toHaveBeenCalled();
  });

  it("lists tags assigned to an order", async () => {
    const db = {
      select: vi.fn(() => createSelectChain([{ tag }])),
    };
    const repository = new DrizzleOrderTagRepository(db as never);

    await expect(repository.listForOrder("order-1")).resolves.toEqual([
      expect.objectContaining({ id: "tag-1" }),
    ]);
  });
});
