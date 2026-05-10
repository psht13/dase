import { and, asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  OwnerShippingSettingsRecord,
  OwnerShippingSettingsRepository,
  SaveOwnerShippingSettingsRecordInput,
  UpdateOwnerShippingSettingsRecordInput,
} from "@/modules/shipping/application/owner-shipping-settings-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbOwnerShippingSettings =
  typeof schema.ownerShippingSettings.$inferSelect;

export class DrizzleOwnerShippingSettingsRepository
  implements OwnerShippingSettingsRepository
{
  constructor(private readonly db: Database) {}

  async findByOwnerId(
    ownerId: string,
  ): Promise<OwnerShippingSettingsRecord | null> {
    const [settings] = await this.db
      .select()
      .from(schema.ownerShippingSettings)
      .where(eq(schema.ownerShippingSettings.ownerId, ownerId))
      .limit(1);

    return settings ? mapOwnerShippingSettings(settings) : null;
  }

  async listByOwnerId(ownerId: string): Promise<OwnerShippingSettingsRecord[]> {
    const settings = await this.db
      .select()
      .from(schema.ownerShippingSettings)
      .where(eq(schema.ownerShippingSettings.ownerId, ownerId))
      .orderBy(asc(schema.ownerShippingSettings.createdAt));

    return settings.map(mapOwnerShippingSettings);
  }

  async save(
    input: SaveOwnerShippingSettingsRecordInput,
  ): Promise<OwnerShippingSettingsRecord> {
    const [savedSettings] = await this.db
      .insert(schema.ownerShippingSettings)
      .values(toDbValues(input))
      .returning();

    if (!savedSettings) {
      throw new Error("Failed to save owner shipping settings");
    }

    return mapOwnerShippingSettings(savedSettings);
  }

  async update(
    input: UpdateOwnerShippingSettingsRecordInput,
  ): Promise<OwnerShippingSettingsRecord | null> {
    const [updatedSettings] = await this.db
      .update(schema.ownerShippingSettings)
      .set({
        ...toDbValues(input),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.ownerShippingSettings.id, input.settingsId),
          eq(schema.ownerShippingSettings.ownerId, input.ownerId),
        ),
      )
      .returning();

    return updatedSettings ? mapOwnerShippingSettings(updatedSettings) : null;
  }
}

function toDbValues(input: SaveOwnerShippingSettingsRecordInput) {
  return {
    apiBaseUrl: input.apiBaseUrl,
    apiEnvironment: input.apiEnvironment,
    apiKeyEncrypted: input.apiKeyEncrypted,
    apiKeyPreview: input.apiKeyPreview,
    authUrl: input.authUrl,
    carrier: input.carrier,
    defaultActualWeightGrams: input.defaultActualWeightGrams,
    defaultHeightMm: input.defaultHeightMm,
    defaultLengthMm: input.defaultLengthMm,
    defaultVolumetricWeightGrams: input.defaultVolumetricWeightGrams,
    defaultWidthMm: input.defaultWidthMm,
    isEnabled: input.isEnabled,
    ownerId: input.ownerId,
    payerContractNumber: input.payerContractNumber,
    payerType: input.payerType,
    senderCompanyName: input.senderCompanyName,
    senderCompanyTin: input.senderCompanyTin,
    senderCountryCode: input.senderCountryCode,
    senderDivisionId: input.senderDivisionId,
    senderEmail: input.senderEmail,
    senderName: input.senderName,
    senderPhone: input.senderPhone,
  };
}

function mapOwnerShippingSettings(
  settings: DbOwnerShippingSettings,
): OwnerShippingSettingsRecord {
  return {
    apiBaseUrl: settings.apiBaseUrl,
    apiEnvironment: settings.apiEnvironment,
    apiKeyEncrypted: settings.apiKeyEncrypted,
    apiKeyPreview: settings.apiKeyPreview,
    authUrl: settings.authUrl,
    carrier: settings.carrier,
    createdAt: settings.createdAt,
    defaultActualWeightGrams: settings.defaultActualWeightGrams,
    defaultHeightMm: settings.defaultHeightMm,
    defaultLengthMm: settings.defaultLengthMm,
    defaultVolumetricWeightGrams: settings.defaultVolumetricWeightGrams,
    defaultWidthMm: settings.defaultWidthMm,
    id: settings.id,
    isEnabled: settings.isEnabled,
    ownerId: settings.ownerId,
    payerContractNumber: settings.payerContractNumber,
    payerType: settings.payerType,
    senderCompanyName: settings.senderCompanyName,
    senderCompanyTin: settings.senderCompanyTin,
    senderCountryCode: settings.senderCountryCode,
    senderDivisionId: settings.senderDivisionId,
    senderEmail: settings.senderEmail,
    senderName: settings.senderName,
    senderPhone: settings.senderPhone,
    updatedAt: settings.updatedAt,
  };
}
