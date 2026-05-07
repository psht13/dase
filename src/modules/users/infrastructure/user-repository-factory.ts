import type { UserRepository } from "@/modules/users/application/user-repository";
import { DrizzleUserRepository } from "@/modules/users/infrastructure/drizzle-user-repository";
import {
  E2eAuthMemoryUserRepository,
  isE2eAuthMemoryEnabled,
} from "@/modules/users/infrastructure/e2e-auth-memory-store";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";

let cachedRepository: UserRepository | undefined;

export function getUserRepository(): UserRepository {
  cachedRepository ??= createUserRepository();

  return cachedRepository;
}

export function resetUserRepositoryForTests(): void {
  cachedRepository = undefined;
}

function createUserRepository(): UserRepository {
  const env = getServerEnv();

  if (env.DATABASE_URL) {
    return new DrizzleUserRepository(createDatabaseClient(env.DATABASE_URL));
  }

  if (isE2eAuthMemoryEnabled()) {
    return new E2eAuthMemoryUserRepository();
  }

  throw new Error("DATABASE_URL is required for user storage");
}
