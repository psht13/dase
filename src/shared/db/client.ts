import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getServerEnv } from "@/shared/config/env";
import * as schema from "./schema";

export function createDatabaseClient(databaseUrl = getServerEnv().DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create a database client");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  return drizzle(pool, { schema });
}
