import { z } from "zod";
import {
  normalizeNovaPostUrl,
  novaPostApiBaseUrls,
  novaPostApiEnvironments,
  novaPostPayerTypes,
  ownerShippingCarrier,
} from "@/modules/shipping/domain/owner-shipping-settings";

const maxPositiveInt = 1_000_000;

const optionalText = (maxLength: number, message: string) =>
  z.preprocess(
    (value) => (value == null ? "" : value),
    z
      .string()
      .trim()
      .max(maxLength, message)
      .transform((value) => value || null),
  );

const optionalEmail = z.preprocess(
  (value) => (value == null ? "" : value),
  z
    .string()
    .trim()
    .email("Вкажіть коректний email відправника")
    .max(160, "Email відправника має бути до 160 символів")
    .or(z.literal(""))
    .transform((value) => value || null),
);

const optionalApiKey = z.preprocess(
  (value) => (value == null || value === "" ? undefined : value),
  z
    .string()
    .trim()
    .min(1, "API ключ не може бути порожнім")
    .max(500, "API ключ має бути до 500 символів")
    .optional(),
);

const positiveInt = (fieldName: string) =>
  z.coerce
    .number()
    .int(`${fieldName} має бути цілим числом`)
    .positive(`${fieldName} має бути більше нуля`)
    .max(maxPositiveInt, `${fieldName} має бути до ${maxPositiveInt}`);

export const ownerShippingSettingsInputSchema = z
  .object({
    apiBaseUrl: z
      .string()
      .trim()
      .url("Вкажіть коректну адресу API Nova Post")
      .max(500, "Адреса API має бути до 500 символів"),
    apiEnvironment: z.enum(novaPostApiEnvironments),
    apiKey: optionalApiKey,
    authUrl: z.preprocess(
      (value) => (value == null ? "" : value),
      z
        .string()
        .trim()
        .url("Вкажіть коректну адресу авторизації")
        .max(500, "Адреса авторизації має бути до 500 символів")
        .or(z.literal(""))
        .transform((value) => value || null),
    ),
    carrier: z.literal(ownerShippingCarrier).default(ownerShippingCarrier),
    defaultActualWeightGrams: positiveInt("Фактична вага"),
    defaultHeightMm: positiveInt("Висота"),
    defaultLengthMm: positiveInt("Довжина"),
    defaultVolumetricWeightGrams: positiveInt("Об’ємна вага"),
    defaultWidthMm: positiveInt("Ширина"),
    isEnabled: z.boolean(),
    ownerId: z.string().trim().min(1, "Вкажіть власника налаштувань"),
    payerContractNumber: optionalText(
      80,
      "Номер договору платника має бути до 80 символів",
    ),
    payerType: z.enum(novaPostPayerTypes),
    senderCompanyName: optionalText(
      160,
      "Назва компанії відправника має бути до 160 символів",
    ),
    senderCompanyTin: optionalText(
      64,
      "ІПН або ЄДРПОУ відправника має бути до 64 символів",
    ),
    senderCountryCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, "Код країни має містити 2 літери")
      .transform((value) => value.toUpperCase()),
    senderDivisionId: z
      .string()
      .trim()
      .min(1, "Вкажіть ідентифікатор відділення відправника")
      .max(80, "Ідентифікатор відділення має бути до 80 символів"),
    senderEmail: optionalEmail,
    senderName: z
      .string()
      .trim()
      .min(1, "Вкажіть ПІБ відправника")
      .max(160, "ПІБ відправника має бути до 160 символів"),
    senderPhone: z
      .string()
      .trim()
      .regex(/^\+?\d{7,20}$/, "Вкажіть коректний телефон відправника"),
  })
  .superRefine((input, context) => {
    const normalizedBaseUrl = safeNormalizeNovaPostUrl(input.apiBaseUrl);

    if (!normalizedBaseUrl || !isSafeNovaPostUrl(normalizedBaseUrl)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Адреса API має бути HTTPS URL без логіна, пароля або параметрів",
        path: ["apiBaseUrl"],
      });
    }

    const officialBaseUrl = novaPostApiBaseUrls[input.apiEnvironment];

    if (
      officialBaseUrl &&
      normalizedBaseUrl &&
      normalizedBaseUrl !== officialBaseUrl
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Адреса API має відповідати вибраному середовищу",
        path: ["apiBaseUrl"],
      });
    }

    if (input.authUrl) {
      const normalizedAuthUrl = safeNormalizeNovaPostUrl(input.authUrl);

      if (!normalizedAuthUrl || !isSafeNovaPostUrl(normalizedAuthUrl)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Адреса авторизації має бути HTTPS URL без логіна, пароля або параметрів",
          path: ["authUrl"],
        });
      }
    }

    if (input.payerType === "ThirdPerson" && !input.payerContractNumber) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Для платника ThirdPerson вкажіть номер договору",
        path: ["payerContractNumber"],
      });
    }
  })
  .transform((input) => ({
    ...input,
    apiBaseUrl: normalizeNovaPostUrl(input.apiBaseUrl),
    authUrl: input.authUrl ? normalizeNovaPostUrl(input.authUrl) : null,
  }));

export type OwnerShippingSettingsInput = z.infer<
  typeof ownerShippingSettingsInputSchema
>;

export function safeParseOwnerShippingSettingsInput(input: unknown):
  | {
      data: OwnerShippingSettingsInput;
      success: true;
    }
  | {
      error: z.ZodError<OwnerShippingSettingsInput>;
      success: false;
    } {
  return ownerShippingSettingsInputSchema.safeParse(input);
}

function safeNormalizeNovaPostUrl(value: string): string | null {
  try {
    return normalizeNovaPostUrl(value);
  } catch {
    return null;
  }
}

function isSafeNovaPostUrl(value: string): boolean {
  const url = new URL(value);

  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash
  );
}
