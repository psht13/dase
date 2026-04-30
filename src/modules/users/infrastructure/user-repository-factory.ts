import type { UserRepository } from "@/modules/users/application/user-repository";
import { DrizzleUserRepository } from "@/modules/users/infrastructure/drizzle-user-repository";
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

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for user storage");
  }

  return new DrizzleUserRepository(createDatabaseClient(env.DATABASE_URL));
}
