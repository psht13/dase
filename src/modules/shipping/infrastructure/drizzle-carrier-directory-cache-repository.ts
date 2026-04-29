import { and, eq, gt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  CarrierDirectoryCacheRecord,
  CarrierDirectoryCacheRepository,
} from "@/modules/shipping/application/carrier-directory-cache-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbCarrierDirectoryCache = typeof schema.carrierDirectoryCache.$inferSelect;

export class DrizzleCarrierDirectoryCacheRepository
  implements CarrierDirectoryCacheRepository
{
  constructor(private readonly db: Database) {}

  async findFresh(
    carrier: CarrierDirectoryCacheRecord["carrier"],
    resourceType: string,
    lookupKey: string,
    now: Date,
  ): Promise<CarrierDirectoryCacheRecord | null> {
    const [entry] = await this.db
      .select()
      .from(schema.carrierDirectoryCache)
      .where(
        and(
          eq(schema.carrierDirectoryCache.carrier, carrier),
          eq(schema.carrierDirectoryCache.resourceType, resourceType),
          eq(schema.carrierDirectoryCache.lookupKey, lookupKey),
          gt(schema.carrierDirectoryCache.expiresAt, now),
        ),
      )
      .limit(1);

    return entry ? mapCacheEntry(entry) : null;
  }

  async upsert(
    entry: Omit<CarrierDirectoryCacheRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<CarrierDirectoryCacheRecord> {
    const [savedEntry] = await this.db
      .insert(schema.carrierDirectoryCache)
      .values({
        carrier: entry.carrier,
        expiresAt: entry.expiresAt,
        lookupKey: entry.lookupKey,
        payload: entry.payload,
        resourceType: entry.resourceType,
      })
      .onConflictDoUpdate({
        set: {
          expiresAt: entry.expiresAt,
          payload: entry.payload,
          updatedAt: new Date(),
        },
        target: [
          schema.carrierDirectoryCache.carrier,
          schema.carrierDirectoryCache.resourceType,
          schema.carrierDirectoryCache.lookupKey,
        ],
      })
      .returning();

    if (!savedEntry) {
      throw new Error("Failed to save carrier directory cache entry");
    }

    return mapCacheEntry(savedEntry);
  }
}

function mapCacheEntry(
  entry: DbCarrierDirectoryCache,
): CarrierDirectoryCacheRecord {
  return {
    carrier: entry.carrier,
    createdAt: entry.createdAt,
    expiresAt: entry.expiresAt,
    id: entry.id,
    lookupKey: entry.lookupKey,
    payload: entry.payload,
    resourceType: entry.resourceType,
    updatedAt: entry.updatedAt,
  };
}
