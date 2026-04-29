import type { OrderRepository } from "@/modules/orders/application/order-repository";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order-repository";
import { InMemoryOrderRepository } from "@/modules/orders/infrastructure/in-memory-order-repository";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: OrderRepository | undefined;
const globalRepositoryKey = "__daseOrderRepository";

type GlobalWithOrderRepository = typeof globalThis & {
  [globalRepositoryKey]?: OrderRepository;
};

export function getOrderRepository(): OrderRepository {
  cachedRepository ??= createOrderRepository();

  return cachedRepository;
}

export function resetOrderRepositoryForTests(): void {
  cachedRepository = undefined;
  delete (globalThis as GlobalWithOrderRepository)[globalRepositoryKey];
}

function createOrderRepository(): OrderRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzleOrderRepository(createDatabaseClient(env.DATABASE_URL));
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithOrderRepository;
    globalStore[globalRepositoryKey] ??= new InMemoryOrderRepository();

    return globalStore[globalRepositoryKey];
  }

  throw new Error("DATABASE_URL is required for order storage");
}

function isPlaywrightFallbackEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1";
}
