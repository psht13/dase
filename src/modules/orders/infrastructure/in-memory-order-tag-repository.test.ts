import { InMemoryOrderTagRepository } from "@/modules/orders/infrastructure/in-memory-order-tag-repository";

describe("InMemoryOrderTagRepository", () => {
  it("stores owner tags and order links", async () => {
    const repository = new InMemoryOrderTagRepository();
    const tag = await repository.save({
      color: null,
      name: "Подарунок",
      ownerId: "owner-1",
    });

    await repository.linkToOrder("order-1", tag.id);

    await expect(repository.listForOwner("owner-1")).resolves.toEqual([
      expect.objectContaining({ name: "Подарунок" }),
    ]);
    await expect(repository.listForOrder("order-1")).resolves.toEqual([
      expect.objectContaining({ id: tag.id }),
    ]);
    await expect(
      repository.findByNameForOwner("Подарунок", "owner-1"),
    ).resolves.toMatchObject({ id: tag.id });

    await repository.unlinkFromOrder("order-1", tag.id);

    await expect(repository.listForOrder("order-1")).resolves.toEqual([]);
  });
});
