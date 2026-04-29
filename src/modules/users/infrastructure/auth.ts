import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { defaultUserRole } from "@/modules/users/domain/roles";
import { getServerEnv } from "@/shared/config/env";
import { createDatabaseClient } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";

type Database = ReturnType<typeof createDatabaseClient>;

let cachedAuth: ReturnType<typeof createAuth> | undefined;

export function createAuth(database?: Database) {
  const env = getServerEnv();
  const db = database ?? createDatabaseClient(env.DATABASE_URL);

  return betterAuth({
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    appName: "Dase",
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
      transaction: true,
    }),
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
