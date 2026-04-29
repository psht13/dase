import type { ProductRepository } from "@/modules/catalog/application/product-repository";
import { DrizzleProductRepository } from "@/modules/catalog/infrastructure/drizzle-product-repository";
import { InMemoryProductRepository } from "@/modules/catalog/infrastructure/in-memory-product-repository";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: ProductRepository | undefined;
const globalRepositoryKey = "__daseProductRepository";

type GlobalWithProductRepository = typeof globalThis & {
  [globalRepositoryKey]?: ProductRepository;
};

export function getProductRepository(): ProductRepository {
  cachedRepository ??= createProductRepository();

  return cachedRepository;
}

export function resetProductRepositoryForTests(): void {
  cachedRepository = undefined;
  delete (globalThis as GlobalWithProductRepository)[globalRepositoryKey];
}

function createProductRepository(): ProductRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzleProductRepository(createDatabaseClient(env.DATABASE_URL));
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithProductRepository;
    globalStore[globalRepositoryKey] ??= new InMemoryProductRepository();

    return globalStore[globalRepositoryKey];
  }

  throw new Error("DATABASE_URL is required for product catalog storage");
}

function isPlaywrightFallbackEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1";
}
