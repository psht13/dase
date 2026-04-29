import type { CarrierDirectoryCacheRepository } from "@/modules/shipping/application/carrier-directory-cache-repository";
import {
  searchCarrierCitiesUseCase,
  searchCarrierWarehousesUseCase,
} from "@/modules/shipping/application/search-carrier-directory";
import type { ShippingCarrier } from "@/modules/shipping/application/shipping-carrier";

describe("carrier directory search use cases", () => {
  const now = new Date("2026-04-30T10:00:00.000Z");

  it("returns cached city lookup results without calling the carrier", async () => {
    const cacheRepository = createCacheRepository({
      payload: {
        results: [{ id: "city-1", name: "Київ", region: "Київська область" }],
      },
    });
    const shippingCarrier = createShippingCarrier();

    await expect(
      searchCarrierCitiesUseCase(
        {
          carrier: "NOVA_POSHTA",
          query: "Київ",
        },
        {
          cacheRepository,
          now: () => now,
          shippingCarrier,
        },
      ),
    ).resolves.toEqual([
      { id: "city-1", name: "Київ", region: "Київська область" },
    ]);
    expect(shippingCarrier.searchCities).not.toHaveBeenCalled();
  });

  it("loads fresh cities and writes them to cache", async () => {
    const cacheRepository = createCacheRepository();
    const shippingCarrier = createShippingCarrier();

    await expect(
      searchCarrierCitiesUseCase(
        {
          carrier: "NOVA_POSHTA",
          limit: 5,
          query: " Київ ",
        },
        {
          cacheRepository,
          now: () => now,
          shippingCarrier,
          ttlMs: 1_000,
        },
      ),
    ).resolves.toEqual([{ id: "city-1", name: "Київ", region: null }]);
    expect(shippingCarrier.searchCities).toHaveBeenCalledWith({
      limit: 5,
      query: "Київ",
    });
    expect(cacheRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        carrier: "NOVA_POSHTA",
        expiresAt: new Date("2026-04-30T10:00:01.000Z"),
        resourceType: "cities",
      }),
    );
  });

  it("does not call the carrier for too-short city queries", async () => {
    const shippingCarrier = createShippingCarrier();

    await expect(
      searchCarrierCitiesUseCase(
        {
          carrier: "NOVA_POSHTA",
          query: "К",
        },
        {
          cacheRepository: createCacheRepository(),
          shippingCarrier,
        },
      ),
    ).resolves.toEqual([]);
    expect(shippingCarrier.searchCities).not.toHaveBeenCalled();
  });

  it("ignores invalid cached city payloads and refreshes from carrier", async () => {
    const cacheRepository = createCacheRepository({
      payload: { results: [{ id: "city-1" }] },
    });
    const shippingCarrier = createShippingCarrier();

    await expect(
      searchCarrierCitiesUseCase(
        {
          carrier: "NOVA_POSHTA",
          limit: 100,
          query: "Київ",
        },
        {
          cacheRepository,
          shippingCarrier,
        },
      ),
    ).resolves.toEqual([{ id: "city-1", name: "Київ", region: null }]);
    expect(shippingCarrier.searchCities).toHaveBeenCalledWith({
      limit: 50,
      query: "Київ",
    });
  });

  it("does not call the carrier when city id is missing for warehouses", async () => {
    const shippingCarrier = createShippingCarrier();

    await expect(
      searchCarrierWarehousesUseCase(
        {
          carrier: "NOVA_POSHTA",
          cityId: "",
        },
        {
          cacheRepository: createCacheRepository(),
          shippingCarrier,
        },
      ),
    ).resolves.toEqual([]);
    expect(shippingCarrier.searchWarehouses).not.toHaveBeenCalled();
  });

  it("caches warehouse lookup results by carrier, city, and query", async () => {
    const cacheRepository = createCacheRepository();
    const shippingCarrier = createShippingCarrier();

    await expect(
      searchCarrierWarehousesUseCase(
        {
          carrier: "UKRPOSHTA",
          cityId: "city-1",
          query: "01001",
        },
        {
          cacheRepository,
          now: () => now,
          shippingCarrier,
        },
      ),
    ).resolves.toEqual([
      {
        address: "вул. Хрещатик, 22",
        cityId: "city-1",
        id: "warehouse-1",
        name: "Відділення 01001",
        number: "01001",
        type: "post-office",
      },
    ]);
    expect(shippingCarrier.searchWarehouses).toHaveBeenCalledWith({
      cityId: "city-1",
      limit: 20,
      query: "01001",
    });
  });
});

function createShippingCarrier(): ShippingCarrier {
  return {
    createShipment: vi.fn(),
    getShipmentStatus: vi.fn(),
    searchCities: vi.fn(async () => [
      { id: "city-1", name: "Київ", region: null },
    ]),
    searchWarehouses: vi.fn(async () => [
      {
        address: "вул. Хрещатик, 22",
        cityId: "city-1",
        id: "warehouse-1",
        name: "Відділення 01001",
        number: "01001",
        type: "post-office",
      },
    ]),
  };
}

function createCacheRepository(
  cached?: { payload: Record<string, unknown> },
): CarrierDirectoryCacheRepository {
  return {
    findFresh: vi.fn(async () =>
      cached
        ? {
            carrier: "NOVA_POSHTA" as const,
            createdAt: new Date("2026-04-30T09:00:00.000Z"),
            expiresAt: new Date("2026-04-30T11:00:00.000Z"),
            id: "cache-1",
            lookupKey: "lookup",
            payload: cached.payload,
            resourceType: "cities",
            updatedAt: new Date("2026-04-30T09:00:00.000Z"),
          }
        : null,
    ),
    upsert: vi.fn(async (entry) => ({
      ...entry,
      createdAt: new Date("2026-04-30T10:00:00.000Z"),
      id: "cache-1",
      updatedAt: new Date("2026-04-30T10:00:00.000Z"),
    })),
  };
}
