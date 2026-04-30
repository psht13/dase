import type { CustomerConfirmationUnitOfWork } from "@/modules/orders/application/customer-confirmation-unit-of-work";
import { DrizzleCustomerConfirmationUnitOfWork } from "@/modules/orders/infrastructure/drizzle-customer-confirmation-unit-of-work";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedUnitOfWork: CustomerConfirmationUnitOfWork | undefined;

export function getCustomerConfirmationUnitOfWork():
  | CustomerConfirmationUnitOfWork
  | undefined {
  const env = getServerEnv();

  if (!env.DATABASE_URL) {
    return undefined;
  }

  cachedUnitOfWork ??= new DrizzleCustomerConfirmationUnitOfWork(
    createDatabaseClient(env.DATABASE_URL),
  );

  return cachedUnitOfWork;
}

export function resetCustomerConfirmationUnitOfWorkForTests(): void {
  cachedUnitOfWork = undefined;
}
