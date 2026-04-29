import { randomUUID } from "node:crypto";
import type {
  CarrierDirectoryCacheRecord,
  CarrierDirectoryCacheRepository,
} from "@/modules/shipping/application/carrier-directory-cache-repository";

export class InMemoryCarrierDirectoryCacheRepository
  implements CarrierDirectoryCacheRepository
{
  private readonly entries = new Map<string, CarrierDirectoryCacheRecord>();

  async findFresh(
    carrier: CarrierDirectoryCacheRecord["carrier"],
    resourceType: string,
    lookupKey: string,
    now: Date,
  ): Promise<CarrierDirectoryCacheRecord | null> {
    const entry = this.entries.get(cacheKey(carrier, resourceType, lookupKey));

    if (!entry || entry.expiresAt.getTime() <= now.getTime()) {
      return null;
    }

    return entry;
  }

  async upsert(
    entry: Omit<CarrierDirectoryCacheRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<CarrierDirectoryCacheRecord> {
    const now = new Date();
    const key = cacheKey(entry.carrier, entry.resourceType, entry.lookupKey);
    const existingEntry = this.entries.get(key);
    const savedEntry: CarrierDirectoryCacheRecord = {
      ...entry,
      createdAt: existingEntry?.createdAt ?? now,
      id: existingEntry?.id ?? randomUUID(),
      updatedAt: now,
    };

    this.entries.set(key, savedEntry);

    return savedEntry;
  }
}

function cacheKey(
  carrier: CarrierDirectoryCacheRecord["carrier"],
  resourceType: string,
  lookupKey: string,
): string {
  return `${carrier}:${resourceType}:${lookupKey}`;
}
