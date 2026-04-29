import type { PaymentRepository } from "@/modules/payments/application/payment-repository";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment-repository";
import { InMemoryPaymentRepository } from "@/modules/payments/infrastructure/in-memory-payment-repository";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: PaymentRepository | undefined;
const globalRepositoryKey = "__dasePaymentRepository";

type GlobalWithPaymentRepository = typeof globalThis & {
  [globalRepositoryKey]?: PaymentRepository;
};

export function getPaymentRepository(): PaymentRepository {
  cachedRepository ??= createPaymentRepository();

  return cachedRepository;
}

export function resetPaymentRepositoryForTests(): void {
  cachedRepository = undefined;
  delete (globalThis as GlobalWithPaymentRepository)[globalRepositoryKey];
}

function createPaymentRepository(): PaymentRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzlePaymentRepository(createDatabaseClient(env.DATABASE_URL));
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithPaymentRepository;
    globalStore[globalRepositoryKey] ??= new InMemoryPaymentRepository();

    return globalStore[globalRepositoryKey];
  }

  throw new Error("DATABASE_URL is required for payment storage");
}

function isPlaywrightFallbackEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1"
  );
}
