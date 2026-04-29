import type { ShipmentCarrier } from "./shipment-repository";

export type CarrierDirectoryCacheRecord = {
  carrier: ShipmentCarrier;
  createdAt: Date;
  expiresAt: Date;
  id: string;
  lookupKey: string;
  payload: Record<string, unknown>;
  resourceType: string;
  updatedAt: Date;
};

export interface CarrierDirectoryCacheRepository {
  findFresh(
    carrier: ShipmentCarrier,
    resourceType: string,
    lookupKey: string,
    now: Date,
  ): Promise<CarrierDirectoryCacheRecord | null>;
  upsert(
    entry: Omit<CarrierDirectoryCacheRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<CarrierDirectoryCacheRecord>;
}
