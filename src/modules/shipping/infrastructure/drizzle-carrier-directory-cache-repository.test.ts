import { DrizzleCarrierDirectoryCacheRepository } from "@/modules/shipping/infrastructure/drizzle-carrier-directory-cache-repository";

function createSelectChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    limit: vi.fn(async () => result),
    where: vi.fn(() => chain),
  };

  return chain;
}

describe("DrizzleCarrierDirectoryCacheRepository", () => {
  const now = new Date("2026-04-30T10:00:00.000Z");
  const cacheEntry = {
    carrier: "NOVA_POSHTA",
    createdAt: now,
    expiresAt: new Date("2026-04-30T11:00:00.000Z"),
    id: "cache-1",
    lookupKey: "kyiv",
    payload: { results: [] },
    resourceType: "cities",
    updatedAt: now,
  } as const;

  it("finds fresh cache entries", async () => {
    const db = {
      select: vi.fn(() => createSelectChain([cacheEntry])),
    };
    const repository = new DrizzleCarrierDirectoryCacheRepository(db as never);

    await expect(
      repository.findFresh("NOVA_POSHTA", "cities", "kyiv", now),
    ).resolves.toEqual(cacheEntry);
  });

  it("upserts cache entries", async () => {
    const returning = vi.fn(async () => [cacheEntry]);
    const onConflictDoUpdate = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const db = {
      insert: vi.fn(() => ({ values })),
    };
    const repository = new DrizzleCarrierDirectoryCacheRepository(db as never);

    await expect(
      repository.upsert({
        carrier: "NOVA_POSHTA",
        expiresAt: cacheEntry.expiresAt,
        lookupKey: "kyiv",
        payload: { results: [] },
        resourceType: "cities",
      }),
    ).resolves.toEqual(cacheEntry);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ lookupKey: "kyiv" }),
    );
    expect(onConflictDoUpdate).toHaveBeenCalled();
  });
});
