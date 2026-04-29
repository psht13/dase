import type { ShipmentRepository } from "@/modules/shipping/application/shipment-repository";
import { DrizzleShipmentRepository } from "@/modules/shipping/infrastructure/drizzle-shipment-repository";
import { InMemoryShipmentRepository } from "@/modules/shipping/infrastructure/in-memory-shipment-repository";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: ShipmentRepository | undefined;
const globalRepositoryKey = "__daseShipmentRepository";

type GlobalWithShipmentRepository = typeof globalThis & {
  [globalRepositoryKey]?: ShipmentRepository;
};

export function getShipmentRepository(): ShipmentRepository {
  cachedRepository ??= createShipmentRepository();

  return cachedRepository;
}

export function resetShipmentRepositoryForTests(): void {
  cachedRepository = undefined;
  delete (globalThis as GlobalWithShipmentRepository)[globalRepositoryKey];
}

function createShipmentRepository(): ShipmentRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzleShipmentRepository(createDatabaseClient(env.DATABASE_URL));
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithShipmentRepository;
    globalStore[globalRepositoryKey] ??= new InMemoryShipmentRepository();

    return globalStore[globalRepositoryKey];
  }

  throw new Error("DATABASE_URL is required for shipment storage");
}

function isPlaywrightFallbackEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1"
  );
}
