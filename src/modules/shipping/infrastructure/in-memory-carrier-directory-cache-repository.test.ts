import { InMemoryCarrierDirectoryCacheRepository } from "@/modules/shipping/infrastructure/in-memory-carrier-directory-cache-repository";

describe("InMemoryCarrierDirectoryCacheRepository", () => {
  it("upserts fresh cache entries and ignores expired entries", async () => {
    const repository = new InMemoryCarrierDirectoryCacheRepository();

    await repository.upsert({
      carrier: "NOVA_POSHTA",
      expiresAt: new Date("2026-04-30T11:00:00.000Z"),
      lookupKey: "kyiv",
      payload: { results: [] },
      resourceType: "cities",
    });

    await expect(
      repository.findFresh(
        "NOVA_POSHTA",
        "cities",
        "kyiv",
        new Date("2026-04-30T10:00:00.000Z"),
      ),
    ).resolves.toMatchObject({ lookupKey: "kyiv" });
    await expect(
      repository.findFresh(
        "NOVA_POSHTA",
        "cities",
        "kyiv",
        new Date("2026-04-30T12:00:00.000Z"),
      ),
    ).resolves.toBeNull();
  });
});
