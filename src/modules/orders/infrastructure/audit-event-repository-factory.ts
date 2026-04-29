import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import { DrizzleAuditEventRepository } from "@/modules/orders/infrastructure/drizzle-audit-event-repository";
import { InMemoryAuditEventRepository } from "@/modules/orders/infrastructure/in-memory-audit-event-repository";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: AuditEventRepository | undefined;
const globalRepositoryKey = "__daseAuditEventRepository";

type GlobalWithAuditEventRepository = typeof globalThis & {
  [globalRepositoryKey]?: AuditEventRepository;
};

export function getAuditEventRepository(): AuditEventRepository {
  cachedRepository ??= createAuditEventRepository();

  return cachedRepository;
}

export function resetAuditEventRepositoryForTests(): void {
  cachedRepository = undefined;
  delete (globalThis as GlobalWithAuditEventRepository)[globalRepositoryKey];
}

function createAuditEventRepository(): AuditEventRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzleAuditEventRepository(createDatabaseClient(env.DATABASE_URL));
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithAuditEventRepository;
    globalStore[globalRepositoryKey] ??= new InMemoryAuditEventRepository();

    return globalStore[globalRepositoryKey];
  }

  throw new Error("DATABASE_URL is required for audit event storage");
}

function isPlaywrightFallbackEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1";
}
