import type { PaymentRequisiteRepository } from "@/modules/payments/application/payment-requisite-repository";
import { DrizzlePaymentRequisiteRepository } from "@/modules/payments/infrastructure/drizzle-payment-requisite-repository";
import { InMemoryPaymentRequisiteRepository } from "@/modules/payments/infrastructure/in-memory-payment-requisite-repository";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: PaymentRequisiteRepository | undefined;
const globalRepositoryKey = "__dasePaymentRequisiteRepository";

type GlobalWithPaymentRequisiteRepository = typeof globalThis & {
  [globalRepositoryKey]?: PaymentRequisiteRepository;
};

export function getPaymentRequisiteRepository(): PaymentRequisiteRepository {
  cachedRepository ??= createPaymentRequisiteRepository();

  return cachedRepository;
}

export function resetPaymentRequisiteRepositoryForTests(): void {
  cachedRepository = undefined;
  delete (globalThis as GlobalWithPaymentRequisiteRepository)[
    globalRepositoryKey
  ];
}

function createPaymentRequisiteRepository(): PaymentRequisiteRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzlePaymentRequisiteRepository(
      createDatabaseClient(env.DATABASE_URL),
    );
  }

  if (isPlaywrightFallbackEnabled()) {
    const globalStore = globalThis as GlobalWithPaymentRequisiteRepository;
    globalStore[globalRepositoryKey] ??=
      new InMemoryPaymentRequisiteRepository();

    return globalStore[globalRepositoryKey];
  }

  throw new Error("DATABASE_URL is required for payment requisite storage");
}

function isPlaywrightFallbackEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1"
  );
}
