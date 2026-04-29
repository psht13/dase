import type { CarrierDirectoryCacheRepository } from "@/modules/shipping/application/carrier-directory-cache-repository";
import { DrizzleCarrierDirectoryCacheRepository } from "@/modules/shipping/infrastructure/drizzle-carrier-directory-cache-repository";
import { InMemoryCarrierDirectoryCacheRepository } from "@/modules/shipping/infrastructure/in-memory-carrier-directory-cache-repository";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: CarrierDirectoryCacheRepository | undefined;
const globalRepositoryKey = "__daseCarrierDirectoryCacheRepository";

type GlobalWithCarrierDirectoryCacheRepository = typeof globalThis & {
  [globalRepositoryKey]?: CarrierDirectoryCacheRepository;
};

export function getCarrierDirectoryCacheRepository(): CarrierDirectoryCacheRepository {
  cachedRepository ??= createCarrierDirectoryCacheRepository();

  return cachedRepository;
}

export function resetCarrierDirectoryCacheRepositoryForTests(): void {
  cachedRepository = undefined;
  delete (globalThis as GlobalWithCarrierDirectoryCacheRepository)[
    globalRepositoryKey
  ];
}

function createCarrierDirectoryCacheRepository(): CarrierDirectoryCacheRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzleCarrierDirectoryCacheRepository(
      createDatabaseClient(env.DATABASE_URL),
    );
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithCarrierDirectoryCacheRepository;
    globalStore[globalRepositoryKey] ??=
      new InMemoryCarrierDirectoryCacheRepository();

    return globalStore[globalRepositoryKey];
  }

  throw new Error("DATABASE_URL is required for carrier directory caching");
}

function isPlaywrightFallbackEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1"
  );
}
