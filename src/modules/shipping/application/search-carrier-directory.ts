import type {
  CarrierDirectoryCacheRepository,
} from "@/modules/shipping/application/carrier-directory-cache-repository";
import type {
  SearchCitiesInput,
  SearchWarehousesInput,
  ShippingCarrier,
  ShippingCity,
  ShippingWarehouse,
} from "@/modules/shipping/application/shipping-carrier";
import type { ShipmentCarrier } from "@/modules/shipping/application/shipment-repository";

const defaultCacheTtlMs = 24 * 60 * 60 * 1_000;
const defaultLimit = 20;

export type CarrierDirectorySearchDependencies = {
  cacheRepository: CarrierDirectoryCacheRepository;
  now?: () => Date;
  shippingCarrier: ShippingCarrier;
  ttlMs?: number;
};

export async function searchCarrierCitiesUseCase(
  input: SearchCitiesInput & { carrier: ShipmentCarrier },
  dependencies: CarrierDirectorySearchDependencies,
): Promise<ShippingCity[]> {
  const query = normalizeLookupValue(input.query);

  if (query.length < 2) {
    return [];
  }

  const limit = normalizeLimit(input.limit);
  const lookupKey = JSON.stringify({ limit, query });

  return cachedLookup({
    carrier: input.carrier,
    dependencies,
    fetchFresh: () => dependencies.shippingCarrier.searchCities({ limit, query }),
    lookupKey,
    resourceType: "cities",
    validatePayload: parseCitiesCachePayload,
  });
}

export async function searchCarrierWarehousesUseCase(
  input: SearchWarehousesInput & { carrier: ShipmentCarrier },
  dependencies: CarrierDirectorySearchDependencies,
): Promise<ShippingWarehouse[]> {
  const cityId = input.cityId.trim();

  if (!cityId) {
    return [];
  }

  const query = normalizeLookupValue(input.query ?? "");
  const limit = normalizeLimit(input.limit);
  const lookupKey = JSON.stringify({ cityId, limit, query });

  return cachedLookup({
    carrier: input.carrier,
    dependencies,
    fetchFresh: () =>
      dependencies.shippingCarrier.searchWarehouses({ cityId, limit, query }),
    lookupKey,
    resourceType: "warehouses",
    validatePayload: parseWarehousesCachePayload,
  });
}

async function cachedLookup<T>({
  carrier,
  dependencies,
  fetchFresh,
  lookupKey,
  resourceType,
  validatePayload,
}: {
  carrier: ShipmentCarrier;
  dependencies: CarrierDirectorySearchDependencies;
  fetchFresh: () => Promise<T[]>;
  lookupKey: string;
  resourceType: string;
  validatePayload: (payload: Record<string, unknown>) => T[] | null;
}): Promise<T[]> {
  const now = dependencies.now?.() ?? new Date();
  const cached = await dependencies.cacheRepository.findFresh(
    carrier,
    resourceType,
    lookupKey,
    now,
  );
  const cachedResults = cached ? validatePayload(cached.payload) : null;

  if (cachedResults) {
    return cachedResults;
  }

  const freshResults = await fetchFresh();
  await dependencies.cacheRepository.upsert({
    carrier,
    expiresAt: new Date(
      now.getTime() + (dependencies.ttlMs ?? defaultCacheTtlMs),
    ),
    lookupKey,
    payload: { results: freshResults as Record<string, unknown>[] },
    resourceType,
  });

  return freshResults;
}

function normalizeLookupValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeLimit(value: number | undefined): number {
  if (!value || !Number.isInteger(value) || value < 1) {
    return defaultLimit;
  }

  return Math.min(value, 50);
}

function parseCitiesCachePayload(
  payload: Record<string, unknown>,
): ShippingCity[] | null {
  const results = payload.results;

  if (!Array.isArray(results) || !results.every(isShippingCity)) {
    return null;
  }

  return results;
}

function parseWarehousesCachePayload(
  payload: Record<string, unknown>,
): ShippingWarehouse[] | null {
  const results = payload.results;

  if (!Array.isArray(results) || !results.every(isShippingWarehouse)) {
    return null;
  }

  return results;
}

function isShippingCity(value: unknown): value is ShippingCity {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    ("region" in value ? typeof value.region === "string" || value.region === null : true)
  );
}

function isShippingWarehouse(value: unknown): value is ShippingWarehouse {
  return (
    typeof value === "object" &&
    value !== null &&
    "cityId" in value &&
    "id" in value &&
    "name" in value &&
    typeof value.cityId === "string" &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}
