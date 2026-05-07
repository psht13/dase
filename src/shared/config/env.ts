import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));
const optionalSecret = z.string().min(32).optional().or(z.literal(""));
const optionalPositiveInt = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().positive().optional(),
);
const shippingLabelCreationMode = z.enum(["disabled", "mock", "live"]);

export const serverEnvSchema = z
  .object({
    AUTO_COMPLETE_AFTER_DELIVERED_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .default(24),
    BETTER_AUTH_SECRET: optionalSecret,
    BETTER_AUTH_URL: optionalUrl,
    DATABASE_URL: optionalUrl,
    DATABASE_URL_TEST: optionalUrl,
    MONOBANK_PUBLIC_KEY: z.string().optional(),
    MONOBANK_API_URL: optionalUrl,
    MONOBANK_TOKEN: z.string().optional(),
    MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NOVA_POST_API_KEY: z.string().optional(),
    NOVA_POST_API_URL: optionalUrl,
    NOVA_POST_AUTH_URL: optionalUrl,
    NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS: optionalPositiveInt,
    NOVA_POST_DEFAULT_HEIGHT_MM: optionalPositiveInt,
    NOVA_POST_DEFAULT_LENGTH_MM: optionalPositiveInt,
    NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS: optionalPositiveInt,
    NOVA_POST_DEFAULT_WIDTH_MM: optionalPositiveInt,
    NOVA_POST_PAYER_CONTRACT_NUMBER: z.string().optional(),
    NOVA_POST_PAYER_TYPE: z
      .enum(["Recipient", "Sender", "ThirdPerson"])
      .optional(),
    NOVA_POST_SENDER_COMPANY_NAME: z.string().optional(),
    NOVA_POST_SENDER_COMPANY_TIN: z.string().optional(),
    NOVA_POST_SENDER_COUNTRY_CODE: z.string().optional(),
    NOVA_POST_SENDER_DIVISION_ID: z.string().optional(),
    NOVA_POST_SENDER_EMAIL: z.string().email().optional().or(z.literal("")),
    NOVA_POST_SENDER_NAME: z.string().optional(),
    NOVA_POST_SENDER_PHONE: z.string().optional(),
    NOVA_POSHTA_API_KEY: z.string().optional(),
    NOVA_POSHTA_API_URL: optionalUrl,
    OWNER_SETUP_TOKEN: optionalSecret,
    SHIPPING_LABEL_CREATION_MODE: shippingLabelCreationMode.optional(),
  })
  .superRefine((env, context) => {
    const labelCreationMode =
      env.SHIPPING_LABEL_CREATION_MODE ??
      (env.NODE_ENV === "production" ? "disabled" : "mock");

    if (env.NODE_ENV === "production" && labelCreationMode === "mock") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SHIPPING_LABEL_CREATION_MODE=mock is not allowed in production",
        path: ["SHIPPING_LABEL_CREATION_MODE"],
      });
    }

    if (labelCreationMode === "live") {
      const requiredLiveShippingKeys = getRequiredLiveShippingKeys(env);

      for (const key of requiredLiveShippingKeys) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} is required when SHIPPING_LABEL_CREATION_MODE=live`,
          path: [key],
        });
      }
    }

    if (env.NODE_ENV !== "production") {
      return;
    }

    const requiredProductionKeys = [
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "DATABASE_URL",
      "OWNER_SETUP_TOKEN",
    ] as const;

    for (const key of requiredProductionKeys) {
      if (!env[key]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} is required in production`,
          path: [key],
        });
      }
    }
  })
  .transform((env) => ({
    ...env,
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET || undefined,
    BETTER_AUTH_URL: env.BETTER_AUTH_URL || undefined,
    DATABASE_URL: env.DATABASE_URL || undefined,
    DATABASE_URL_TEST: env.DATABASE_URL_TEST || undefined,
    MONOBANK_API_URL: env.MONOBANK_API_URL || undefined,
    NOVA_POST_API_KEY: env.NOVA_POST_API_KEY || undefined,
    NOVA_POST_API_URL: env.NOVA_POST_API_URL || undefined,
    NOVA_POST_AUTH_URL: env.NOVA_POST_AUTH_URL || undefined,
    NOVA_POST_PAYER_CONTRACT_NUMBER:
      env.NOVA_POST_PAYER_CONTRACT_NUMBER || undefined,
    NOVA_POST_SENDER_COMPANY_NAME:
      env.NOVA_POST_SENDER_COMPANY_NAME || undefined,
    NOVA_POST_SENDER_COMPANY_TIN: env.NOVA_POST_SENDER_COMPANY_TIN || undefined,
    NOVA_POST_SENDER_COUNTRY_CODE:
      env.NOVA_POST_SENDER_COUNTRY_CODE || undefined,
    NOVA_POST_SENDER_DIVISION_ID: env.NOVA_POST_SENDER_DIVISION_ID || undefined,
    NOVA_POST_SENDER_EMAIL: env.NOVA_POST_SENDER_EMAIL || undefined,
    NOVA_POST_SENDER_NAME: env.NOVA_POST_SENDER_NAME || undefined,
    NOVA_POST_SENDER_PHONE: env.NOVA_POST_SENDER_PHONE || undefined,
    NOVA_POSHTA_API_KEY: env.NOVA_POSHTA_API_KEY || undefined,
    NOVA_POSHTA_API_URL: env.NOVA_POSHTA_API_URL || undefined,
    OWNER_SETUP_TOKEN: env.OWNER_SETUP_TOKEN || undefined,
    SHIPPING_LABEL_CREATION_MODE:
      env.SHIPPING_LABEL_CREATION_MODE ??
      (env.NODE_ENV === "production" ? "disabled" : "mock"),
  }));

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function validateServerEnv(input: NodeJS.ProcessEnv): ServerEnv {
  const result = serverEnvSchema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  const details = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

export function getServerEnv(): ServerEnv {
  cachedEnv ??= validateServerEnv(process.env);
  return cachedEnv;
}

export function resetServerEnvForTests(): void {
  cachedEnv = undefined;
}

function getRequiredLiveShippingKeys(env: {
  NOVA_POST_API_KEY?: string;
  NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS?: number;
  NOVA_POST_DEFAULT_HEIGHT_MM?: number;
  NOVA_POST_DEFAULT_LENGTH_MM?: number;
  NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS?: number;
  NOVA_POST_DEFAULT_WIDTH_MM?: number;
  NOVA_POST_PAYER_CONTRACT_NUMBER?: string;
  NOVA_POST_PAYER_TYPE?: "Recipient" | "Sender" | "ThirdPerson";
  NOVA_POST_SENDER_COUNTRY_CODE?: string;
  NOVA_POST_SENDER_DIVISION_ID?: string;
  NOVA_POST_SENDER_NAME?: string;
  NOVA_POST_SENDER_PHONE?: string;
  NOVA_POSHTA_API_KEY?: string;
}): string[] {
  const missingKeys: string[] = [];

  if (!env.NOVA_POST_API_KEY && !env.NOVA_POSHTA_API_KEY) {
    missingKeys.push("NOVA_POST_API_KEY");
  }

  const requiredKeys = [
    "NOVA_POST_SENDER_COUNTRY_CODE",
    "NOVA_POST_SENDER_DIVISION_ID",
    "NOVA_POST_SENDER_NAME",
    "NOVA_POST_SENDER_PHONE",
    "NOVA_POST_PAYER_TYPE",
    "NOVA_POST_DEFAULT_WIDTH_MM",
    "NOVA_POST_DEFAULT_LENGTH_MM",
    "NOVA_POST_DEFAULT_HEIGHT_MM",
    "NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS",
    "NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS",
  ] as const;

  for (const key of requiredKeys) {
    if (!env[key]) {
      missingKeys.push(key);
    }
  }

  if (
    env.NOVA_POST_PAYER_TYPE === "ThirdPerson" &&
    !env.NOVA_POST_PAYER_CONTRACT_NUMBER
  ) {
    missingKeys.push("NOVA_POST_PAYER_CONTRACT_NUMBER");
  }

  return missingKeys;
}
