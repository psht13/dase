import type { WebhookEventRepository } from "@/modules/payments/application/webhook-event-repository";
import { DrizzleWebhookEventRepository } from "@/modules/payments/infrastructure/drizzle-webhook-event-repository";
import { InMemoryWebhookEventRepository } from "@/modules/payments/infrastructure/in-memory-webhook-event-repository";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: WebhookEventRepository | undefined;
const globalRepositoryKey = "__daseWebhookEventRepository";

type GlobalWithWebhookEventRepository = typeof globalThis & {
  [globalRepositoryKey]?: WebhookEventRepository;
};

export function getWebhookEventRepository(): WebhookEventRepository {
  cachedRepository ??= createWebhookEventRepository();

  return cachedRepository;
}

export function resetWebhookEventRepositoryForTests(): void {
  cachedRepository = undefined;
  delete (globalThis as GlobalWithWebhookEventRepository)[globalRepositoryKey];
}

function createWebhookEventRepository(): WebhookEventRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzleWebhookEventRepository(
      createDatabaseClient(env.DATABASE_URL),
    );
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithWebhookEventRepository;
    globalStore[globalRepositoryKey] ??= new InMemoryWebhookEventRepository();

    return globalStore[globalRepositoryKey];
  }

  throw new Error("DATABASE_URL is required for webhook event storage");
}

function isPlaywrightFallbackEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1"
  );
}
