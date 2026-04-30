import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { OwnerSetupLock } from "@/modules/users/application/owner-setup-lock";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;

const ownerSetupAdvisoryLockId = 540240744;

export class DrizzleOwnerSetupLock implements OwnerSetupLock {
  constructor(private readonly db: Database) {}

  async runExclusive<T>(work: () => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${ownerSetupAdvisoryLockId})`);

      return work();
    });
  }
}
