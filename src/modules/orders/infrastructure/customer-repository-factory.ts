import type { CustomerRepository } from "@/modules/orders/application/customer-repository";
import { DrizzleCustomerRepository } from "@/modules/orders/infrastructure/drizzle-customer-repository";
import { InMemoryCustomerRepository } from "@/modules/orders/infrastructure/in-memory-customer-repository";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: CustomerRepository | undefined;
const globalRepositoryKey = "__daseCustomerRepository";

type GlobalWithCustomerRepository = typeof globalThis & {
  [globalRepositoryKey]?: CustomerRepository;
};

export function getCustomerRepository(): CustomerRepository {
  cachedRepository ??= createCustomerRepository();

  return cachedRepository;
}

export function resetCustomerRepositoryForTests(): void {
  cachedRepository = undefined;
  delete (globalThis as GlobalWithCustomerRepository)[globalRepositoryKey];
}

function createCustomerRepository(): CustomerRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzleCustomerRepository(createDatabaseClient(env.DATABASE_URL));
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithCustomerRepository;
    globalStore[globalRepositoryKey] ??= new InMemoryCustomerRepository();

    return globalStore[globalRepositoryKey];
  }

  throw new Error("DATABASE_URL is required for customer storage");
}

function isPlaywrightFallbackEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1"
  );
}
