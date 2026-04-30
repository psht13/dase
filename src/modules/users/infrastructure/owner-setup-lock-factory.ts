import type { OwnerSetupLock } from "@/modules/users/application/owner-setup-lock";
import { DrizzleOwnerSetupLock } from "@/modules/users/infrastructure/drizzle-owner-setup-lock";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedLock: OwnerSetupLock | undefined;

export function getOwnerSetupLock(): OwnerSetupLock | undefined {
  const env = getServerEnv();

  if (!env.DATABASE_URL) {
    return undefined;
  }

  cachedLock ??= new DrizzleOwnerSetupLock(createDatabaseClient(env.DATABASE_URL));

  return cachedLock;
}

export function resetOwnerSetupLockForTests(): void {
  cachedLock = undefined;
}
