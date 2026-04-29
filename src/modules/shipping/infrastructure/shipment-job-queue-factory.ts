import type { ShipmentJobQueue } from "@/modules/shipping/application/shipment-job-queue";
import { InMemoryShipmentJobQueue } from "@/modules/shipping/infrastructure/in-memory-shipment-job-queue";
import {
  createPgBoss,
  PgBossShipmentJobQueue,
} from "@/modules/shipping/infrastructure/pg-boss-shipment-job-queue";
import { getServerEnv } from "@/shared/config/env";

let cachedQueue: ShipmentJobQueue | undefined;
const globalQueueKey = "__daseShipmentJobQueue";

type GlobalWithShipmentJobQueue = typeof globalThis & {
  [globalQueueKey]?: ShipmentJobQueue;
};

export function getShipmentJobQueue(): ShipmentJobQueue {
  cachedQueue ??= createShipmentJobQueue();

  return cachedQueue;
}

export function resetShipmentJobQueueForTests(): void {
  cachedQueue = undefined;
  delete (globalThis as GlobalWithShipmentJobQueue)[globalQueueKey];
}

function createShipmentJobQueue(): ShipmentJobQueue {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new PgBossShipmentJobQueue(createPgBoss(env.DATABASE_URL));
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithShipmentJobQueue;
    globalStore[globalQueueKey] ??= new InMemoryShipmentJobQueue();

    return globalStore[globalQueueKey];
  }

  throw new Error("DATABASE_URL is required for shipment jobs");
}

function isPlaywrightFallbackEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1"
  );
}
