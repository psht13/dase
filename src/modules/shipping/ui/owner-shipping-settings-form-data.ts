import type { OwnerShippingSettingsReadModel } from "@/modules/shipping/application/owner-shipping-settings-repository";
import type { OwnerShippingSettingsInput } from "@/modules/shipping/application/owner-shipping-settings-validation";
import {
  type NovaPostApiEnvironment,
  novaPostApiBaseUrls,
  type NovaPostPayerType,
  ownerShippingCarrier,
} from "@/modules/shipping/domain/owner-shipping-settings";

export type OwnerShippingSettingsFormValues = {
  apiBaseUrl: string;
  apiEnvironment: NovaPostApiEnvironment;
  apiKeyConfigured: boolean;
  apiKeyPreview: string | null;
  authUrl: string;
  defaultActualWeightGrams: number;
  defaultHeightMm: number;
  defaultLengthMm: number;
  defaultVolumetricWeightGrams: number;
  defaultWidthMm: number;
  formVersion: string;
  id: string | null;
  isEnabled: boolean;
  payerContractNumber: string;
  payerType: NovaPostPayerType;
  senderCompanyName: string;
  senderCompanyTin: string;
  senderCountryCode: string;
  senderDivisionId: string;
  senderEmail: string;
  senderName: string;
  senderPhone: string;
};

export const defaultOwnerShippingSettingsFormValues: OwnerShippingSettingsFormValues =
  {
    apiBaseUrl: novaPostApiBaseUrls.stage,
    apiEnvironment: "stage",
    apiKeyConfigured: false,
    apiKeyPreview: null,
    authUrl: "",
    defaultActualWeightGrams: 500,
    defaultHeightMm: 100,
    defaultLengthMm: 300,
    defaultVolumetricWeightGrams: 500,
    defaultWidthMm: 200,
    formVersion: "new",
    id: null,
    isEnabled: false,
    payerContractNumber: "",
    payerType: "Recipient",
    senderCompanyName: "",
    senderCompanyTin: "",
    senderCountryCode: "UA",
    senderDivisionId: "",
    senderEmail: "",
    senderName: "",
    senderPhone: "",
  };

export function ownerShippingSettingsFormValuesFromReadModel(
  settings: OwnerShippingSettingsReadModel | null,
): OwnerShippingSettingsFormValues {
  if (!settings) {
    return defaultOwnerShippingSettingsFormValues;
  }

  return {
    apiBaseUrl: settings.apiBaseUrl,
    apiEnvironment: settings.apiEnvironment,
    apiKeyConfigured: settings.apiKeyConfigured,
    apiKeyPreview: settings.apiKeyPreview,
    authUrl: settings.authUrl ?? "",
    defaultActualWeightGrams: settings.defaultActualWeightGrams,
    defaultHeightMm: settings.defaultHeightMm,
    defaultLengthMm: settings.defaultLengthMm,
    defaultVolumetricWeightGrams: settings.defaultVolumetricWeightGrams,
    defaultWidthMm: settings.defaultWidthMm,
    formVersion: settings.updatedAt.toISOString(),
    id: settings.id,
    isEnabled: settings.isEnabled,
    payerContractNumber: settings.payerContractNumber ?? "",
    payerType: settings.payerType,
    senderCompanyName: settings.senderCompanyName ?? "",
    senderCompanyTin: settings.senderCompanyTin ?? "",
    senderCountryCode: settings.senderCountryCode,
    senderDivisionId: settings.senderDivisionId,
    senderEmail: settings.senderEmail ?? "",
    senderName: settings.senderName,
    senderPhone: settings.senderPhone,
  };
}

export function ownerShippingSettingsInputFromFormData(
  formData: FormData,
  ownerId: string,
): OwnerShippingSettingsInput {
  const apiKeyConfigured = formData.get("apiKeyConfigured") === "true";
  const replaceApiKey = formData.get("replaceApiKey") === "on";

  return {
    apiBaseUrl: formValue(formData, "apiBaseUrl"),
    apiEnvironment: formValue(
      formData,
      "apiEnvironment",
    ) as NovaPostApiEnvironment,
    apiKey:
      !apiKeyConfigured || replaceApiKey
        ? formValue(formData, "apiKey")
        : undefined,
    authUrl: formValue(formData, "authUrl"),
    carrier: ownerShippingCarrier,
    defaultActualWeightGrams: numberValue(
      formData,
      "defaultActualWeightGrams",
    ),
    defaultHeightMm: numberValue(formData, "defaultHeightMm"),
    defaultLengthMm: numberValue(formData, "defaultLengthMm"),
    defaultVolumetricWeightGrams: numberValue(
      formData,
      "defaultVolumetricWeightGrams",
    ),
    defaultWidthMm: numberValue(formData, "defaultWidthMm"),
    isEnabled: formData.get("isEnabled") === "on",
    ownerId,
    payerContractNumber: formValue(formData, "payerContractNumber"),
    payerType: formValue(formData, "payerType") as NovaPostPayerType,
    senderCompanyName: formValue(formData, "senderCompanyName"),
    senderCompanyTin: formValue(formData, "senderCompanyTin"),
    senderCountryCode: formValue(formData, "senderCountryCode"),
    senderDivisionId: formValue(formData, "senderDivisionId"),
    senderEmail: formValue(formData, "senderEmail"),
    senderName: formValue(formData, "senderName"),
    senderPhone: formValue(formData, "senderPhone"),
  };
}

function formValue(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function numberValue(formData: FormData, key: string): number {
  const value = Number(formData.get(key) ?? 0);

  return Number.isFinite(value) ? value : Number.NaN;
}
