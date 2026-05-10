import type { ApplicationEncryptionService } from "@/modules/shipping/application/application-encryption-service";
import type {
  OwnerShippingSettingsReadModel,
  OwnerShippingSettingsRepository,
  SaveOwnerShippingSettingsRecordInput,
} from "@/modules/shipping/application/owner-shipping-settings-repository";
import { toOwnerShippingSettingsReadModel } from "@/modules/shipping/application/owner-shipping-settings-repository";
import {
  type OwnerShippingSettingsInput,
  safeParseOwnerShippingSettingsInput,
} from "@/modules/shipping/application/owner-shipping-settings-validation";
import { createNovaPostApiKeyPreview } from "@/modules/shipping/domain/owner-shipping-settings";

type OwnerShippingSettingsDependencies = {
  ownerShippingSettingsRepository: OwnerShippingSettingsRepository;
};

type SaveOwnerShippingSettingsDependencies = OwnerShippingSettingsDependencies & {
  encryptionService: ApplicationEncryptionService;
};

export class OwnerShippingSettingsNotFoundError extends Error {
  constructor() {
    super("Owner shipping settings were not found");
    this.name = "OwnerShippingSettingsNotFoundError";
  }
}

export async function listOwnerShippingSettingsUseCase(
  input: {
    ownerId: string;
  },
  dependencies: OwnerShippingSettingsDependencies,
): Promise<OwnerShippingSettingsReadModel[]> {
  const settings =
    await dependencies.ownerShippingSettingsRepository.listByOwnerId(
      input.ownerId,
    );

  return settings.map(toOwnerShippingSettingsReadModel);
}

export async function getOwnerShippingSettingsUseCase(
  input: {
    ownerId: string;
  },
  dependencies: OwnerShippingSettingsDependencies,
): Promise<OwnerShippingSettingsReadModel | null> {
  const settings =
    await dependencies.ownerShippingSettingsRepository.findByOwnerId(
      input.ownerId,
    );

  return settings ? toOwnerShippingSettingsReadModel(settings) : null;
}

export async function saveOwnerShippingSettingsUseCase(
  input: unknown,
  dependencies: SaveOwnerShippingSettingsDependencies,
): Promise<OwnerShippingSettingsReadModel> {
  const parsedInput = safeParseOwnerShippingSettingsInput(input);

  if (!parsedInput.success) {
    throw parsedInput.error;
  }

  const existingSettings =
    await dependencies.ownerShippingSettingsRepository.findByOwnerId(
      parsedInput.data.ownerId,
    );
  const encryptedApiKey = await resolveEncryptedApiKey(
    parsedInput.data,
    existingSettings?.apiKeyEncrypted ?? null,
    dependencies.encryptionService,
  );
  const apiKeyPreview = resolveApiKeyPreview(
    parsedInput.data,
    existingSettings?.apiKeyPreview ?? null,
  );
  const recordInput = toRecordInput(parsedInput.data, {
    apiKeyEncrypted: encryptedApiKey,
    apiKeyPreview,
  });
  const savedSettings = existingSettings
    ? await dependencies.ownerShippingSettingsRepository.update({
        ...recordInput,
        settingsId: existingSettings.id,
      })
    : await dependencies.ownerShippingSettingsRepository.save(recordInput);

  if (!savedSettings) {
    throw new OwnerShippingSettingsNotFoundError();
  }

  return toOwnerShippingSettingsReadModel(savedSettings);
}

async function resolveEncryptedApiKey(
  input: OwnerShippingSettingsInput,
  existingEncryptedApiKey: string | null,
  encryptionService: ApplicationEncryptionService,
): Promise<string | null> {
  if (!input.apiKey) {
    return existingEncryptedApiKey;
  }

  return encryptionService.encrypt(input.apiKey);
}

function resolveApiKeyPreview(
  input: OwnerShippingSettingsInput,
  existingApiKeyPreview: string | null,
): string | null {
  if (!input.apiKey) {
    return existingApiKeyPreview;
  }

  return createNovaPostApiKeyPreview(input.apiKey);
}

function toRecordInput(
  input: OwnerShippingSettingsInput,
  encryptedKey: {
    apiKeyEncrypted: string | null;
    apiKeyPreview: string | null;
  },
): SaveOwnerShippingSettingsRecordInput {
  return {
    apiBaseUrl: input.apiBaseUrl,
    apiEnvironment: input.apiEnvironment,
    apiKeyEncrypted: encryptedKey.apiKeyEncrypted,
    apiKeyPreview: encryptedKey.apiKeyPreview,
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
