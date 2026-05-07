import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { memoryAdapter } from "better-auth/adapters/memory";
import { nextCookies } from "better-auth/next-js";
import { defaultUserRole } from "@/modules/users/domain/roles";
import {
  getE2eAuthMemoryDb,
  isE2eAuthMemoryEnabled,
} from "@/modules/users/infrastructure/e2e-auth-memory-store";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";

type Database = ReturnType<typeof createDatabaseClient>;

let cachedAuth: ReturnType<typeof createAuth> | undefined;

export function createAuth(database?: Database) {
  const env = getServerEnv();
  const authDatabase =
    database || !isE2eAuthMemoryEnabled()
      ? drizzleAdapter(database ?? createDatabaseClient(env.DATABASE_URL), {
          provider: "pg",
          schema,
          transaction: true,
        })
      : memoryAdapter(getE2eAuthMemoryDb());

  return betterAuth({
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    appName: "Dase",
    baseURL: env.BETTER_AUTH_URL,
    database: authDatabase,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [nextCookies()],
    secret: env.BETTER_AUTH_SECRET,
    account: {
      modelName: "accounts",
    },
    session: {
      modelName: "sessions",
    },
    user: {
      additionalFields: {
        role: {
          defaultValue: defaultUserRole,
          input: false,
          required: true,
          type: "string",
        },
      },
      modelName: "users",
    },
    verification: {
      modelName: "verifications",
    },
  });
}

export function getAuth() {
  cachedAuth ??= createAuth();

  return cachedAuth;
}

export function resetAuthForTests(): void {
  cachedAuth = undefined;
}
