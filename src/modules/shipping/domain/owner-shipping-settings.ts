export const ownerShippingCarrier = "NOVA_POST" as const;

export type OwnerShippingCarrier = typeof ownerShippingCarrier;

export const novaPostApiEnvironments = [
  "stage",
  "production_global",
  "production_ukraine",
  "custom",
] as const;

export type NovaPostApiEnvironment =
  (typeof novaPostApiEnvironments)[number];

export const novaPostApiBaseUrls = {
  custom: null,
  production_global: "https://api.novapost.com/v.1.0/",
  production_ukraine: "https://api.novaposhta.ua/v.1.0/",
  stage: "https://api-stage.novapost.pl/v.1.0/",
} satisfies Record<NovaPostApiEnvironment, string | null>;

export const novaPostPayerTypes = [
  "Recipient",
  "Sender",
  "ThirdPerson",
] as const;

export type NovaPostPayerType = (typeof novaPostPayerTypes)[number];

export type OwnerShippingSettingsCore = {
  apiBaseUrl: string;
  apiEnvironment: NovaPostApiEnvironment;
  authUrl: string | null;
  carrier: OwnerShippingCarrier;
  defaultActualWeightGrams: number;
  defaultHeightMm: number;
  defaultLengthMm: number;
  defaultVolumetricWeightGrams: number;
  defaultWidthMm: number;
  isEnabled: boolean;
  payerContractNumber: string | null;
  payerType: NovaPostPayerType;
  senderCompanyName: string | null;
  senderCompanyTin: string | null;
  senderCountryCode: string;
  senderDivisionId: string;
  senderEmail: string | null;
  senderName: string;
  senderPhone: string;
};

export function createNovaPostApiKeyPreview(apiKey: string): string {
  const trimmedApiKey = apiKey.trim();
  const visibleSuffix = trimmedApiKey.slice(-4);

  return `****${visibleSuffix}`;
}

export function normalizeNovaPostUrl(value: string): string {
  const url = new URL(value.trim());

  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }

  return url.toString();
}
