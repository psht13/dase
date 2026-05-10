import type {
  NovaPostApiEnvironment,
  NovaPostPayerType,
  OwnerShippingCarrier,
} from "@/modules/shipping/domain/owner-shipping-settings";

export type OwnerShippingSettingsRecord = {
  apiBaseUrl: string;
  apiEnvironment: NovaPostApiEnvironment;
  apiKeyEncrypted: string | null;
  apiKeyPreview: string | null;
  authUrl: string | null;
  carrier: OwnerShippingCarrier;
  createdAt: Date;
  defaultActualWeightGrams: number;
  defaultHeightMm: number;
  defaultLengthMm: number;
  defaultVolumetricWeightGrams: number;
  defaultWidthMm: number;
  id: string;
  isEnabled: boolean;
  ownerId: string;
  payerContractNumber: string | null;
  payerType: NovaPostPayerType;
  senderCompanyName: string | null;
  senderCompanyTin: string | null;
  senderCountryCode: string;
  senderDivisionId: string;
  senderEmail: string | null;
  senderName: string;
  senderPhone: string;
  updatedAt: Date;
};

export type OwnerShippingSettingsReadModel = Omit<
  OwnerShippingSettingsRecord,
  "apiKeyEncrypted"
> & {
  apiKeyConfigured: boolean;
};

export type SaveOwnerShippingSettingsRecordInput = Omit<
  OwnerShippingSettingsRecord,
  "createdAt" | "id" | "updatedAt"
>;

export type UpdateOwnerShippingSettingsRecordInput =
  SaveOwnerShippingSettingsRecordInput & {
    settingsId: string;
  };

export interface OwnerShippingSettingsRepository {
  findByOwnerId(ownerId: string): Promise<OwnerShippingSettingsRecord | null>;
  listByOwnerId(ownerId: string): Promise<OwnerShippingSettingsRecord[]>;
  save(
    input: SaveOwnerShippingSettingsRecordInput,
  ): Promise<OwnerShippingSettingsRecord>;
  update(
    input: UpdateOwnerShippingSettingsRecordInput,
  ): Promise<OwnerShippingSettingsRecord | null>;
}

export function toOwnerShippingSettingsReadModel(
  settings: OwnerShippingSettingsRecord,
): OwnerShippingSettingsReadModel {
  return {
    apiBaseUrl: settings.apiBaseUrl,
    apiEnvironment: settings.apiEnvironment,
    apiKeyConfigured: Boolean(settings.apiKeyEncrypted),
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
