import { randomUUID } from "node:crypto";
import type {
  OwnerShippingSettingsRecord,
  OwnerShippingSettingsRepository,
  SaveOwnerShippingSettingsRecordInput,
  UpdateOwnerShippingSettingsRecordInput,
} from "@/modules/shipping/application/owner-shipping-settings-repository";

export class InMemoryOwnerShippingSettingsRepository
  implements OwnerShippingSettingsRepository
{
  private readonly settings = new Map<string, OwnerShippingSettingsRecord>();

  async findByOwnerId(
    ownerId: string,
  ): Promise<OwnerShippingSettingsRecord | null> {
    return (
      [...this.settings.values()].find(
        (settings) => settings.ownerId === ownerId,
      ) ?? null
    );
  }

  async listByOwnerId(ownerId: string): Promise<OwnerShippingSettingsRecord[]> {
    return [...this.settings.values()]
      .filter((settings) => settings.ownerId === ownerId)
      .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime());
  }

  async save(
    input: SaveOwnerShippingSettingsRecordInput,
  ): Promise<OwnerShippingSettingsRecord> {
    const now = new Date();
    const settings: OwnerShippingSettingsRecord = {
      ...input,
      createdAt: now,
      id: randomUUID(),
      updatedAt: now,
    };

    this.settings.set(settings.id, settings);

    return settings;
  }

  async update(
    input: UpdateOwnerShippingSettingsRecordInput,
  ): Promise<OwnerShippingSettingsRecord | null> {
    const currentSettings = this.settings.get(input.settingsId);

    if (!currentSettings || currentSettings.ownerId !== input.ownerId) {
      return null;
    }

    const updatedSettings: OwnerShippingSettingsRecord = {
      ...currentSettings,
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
      payerContractNumber: input.payerContractNumber,
      payerType: input.payerType,
      senderCompanyName: input.senderCompanyName,
      senderCompanyTin: input.senderCompanyTin,
      senderCountryCode: input.senderCountryCode,
      senderDivisionId: input.senderDivisionId,
      senderEmail: input.senderEmail,
      senderName: input.senderName,
      senderPhone: input.senderPhone,
      updatedAt: new Date(),
    };

    this.settings.set(updatedSettings.id, updatedSettings);

    return updatedSettings;
  }
}
