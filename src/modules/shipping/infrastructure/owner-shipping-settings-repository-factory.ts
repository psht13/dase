import type { OwnerShippingSettingsRepository } from "@/modules/shipping/application/owner-shipping-settings-repository";
import { DrizzleOwnerShippingSettingsRepository } from "@/modules/shipping/infrastructure/drizzle-owner-shipping-settings-repository";
import { InMemoryOwnerShippingSettingsRepository } from "@/modules/shipping/infrastructure/in-memory-owner-shipping-settings-repository";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: OwnerShippingSettingsRepository | undefined;
const globalRepositoryKey = "__daseOwnerShippingSettingsRepository";

type GlobalWithOwnerShippingSettingsRepository = typeof globalThis & {
  [globalRepositoryKey]?: OwnerShippingSettingsRepository;
};

export function getOwnerShippingSettingsRepository(): OwnerShippingSettingsRepository {
  cachedRepository ??= createOwnerShippingSettingsRepository();

  return cachedRepository;
}

export function resetOwnerShippingSettingsRepositoryForTests(): void {
  cachedRepository = undefined;
  delete (globalThis as GlobalWithOwnerShippingSettingsRepository)[
    globalRepositoryKey
  ];
}

function createOwnerShippingSettingsRepository(): OwnerShippingSettingsRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzleOwnerShippingSettingsRepository(
      createDatabaseClient(env.DATABASE_URL),
    );
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithOwnerShippingSettingsRepository;
    globalStore[globalRepositoryKey] ??=
      new InMemoryOwnerShippingSettingsRepository();

    return globalStore[globalRepositoryKey];
  }

  throw new Error("DATABASE_URL is required for owner shipping settings storage");
}

function isPlaywrightFallbackEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1"
  );
}
