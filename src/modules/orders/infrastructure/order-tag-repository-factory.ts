import type { OrderTagRepository } from "@/modules/orders/application/order-tag-repository";
import { DrizzleOrderTagRepository } from "@/modules/orders/infrastructure/drizzle-order-tag-repository";
import { InMemoryOrderTagRepository } from "@/modules/orders/infrastructure/in-memory-order-tag-repository";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: OrderTagRepository | undefined;
const globalRepositoryKey = "__daseOrderTagRepository";

type GlobalWithOrderTagRepository = typeof globalThis & {
  [globalRepositoryKey]?: OrderTagRepository;
};

export function getOrderTagRepository(): OrderTagRepository {
  cachedRepository ??= createOrderTagRepository();

  return cachedRepository;
}

export function resetOrderTagRepositoryForTests(): void {
  cachedRepository = undefined;
  delete (globalThis as GlobalWithOrderTagRepository)[globalRepositoryKey];
}

function createOrderTagRepository(): OrderTagRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzleOrderTagRepository(createDatabaseClient(env.DATABASE_URL));
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithOrderTagRepository;
    globalStore[globalRepositoryKey] ??= new InMemoryOrderTagRepository();

    return globalStore[globalRepositoryKey];
  }

  throw new Error("DATABASE_URL is required for order tag storage");
}

function isPlaywrightFallbackEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1"
  );
}
