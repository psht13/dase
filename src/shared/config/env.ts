import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);
const optionalEmail = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().email().optional(),
);
const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(32).optional(),
);
const optionalPositiveInt = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().positive().optional(),
);
const shippingLabelCreationMode = z.enum(["disabled", "mock", "live"]);
const optionalShippingLabelCreationMode = z.preprocess(
  (value) => (value === "" ? undefined : value),
  shippingLabelCreationMode.optional(),
);

export const serverEnvSchema = z
  .object({
    AUTO_COMPLETE_AFTER_DELIVERED_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .default(24),
    APP_ENCRYPTION_KEY: optionalString,
    BETTER_AUTH_SECRET: optionalSecret,
    BETTER_AUTH_URL: optionalUrl,
    DATABASE_URL: optionalUrl,
    DATABASE_URL_TEST: optionalUrl,
    MONOBANK_PUBLIC_KEY: optionalString,
    MONOBANK_API_URL: optionalUrl,
    MONOBANK_TOKEN: optionalString,
    MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY: optionalString,
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NOVA_POST_API_KEY: optionalString,
    NOVA_POST_API_URL: optionalUrl,
    NOVA_POST_AUTH_URL: optionalUrl,
    NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS: optionalPositiveInt,
    NOVA_POST_DEFAULT_HEIGHT_MM: optionalPositiveInt,
    NOVA_POST_DEFAULT_LENGTH_MM: optionalPositiveInt,
    NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS: optionalPositiveInt,
    NOVA_POST_DEFAULT_WIDTH_MM: optionalPositiveInt,
    NOVA_POST_PAYER_CONTRACT_NUMBER: optionalString,
    NOVA_POST_PAYER_TYPE: z
      .enum(["Recipient", "Sender", "ThirdPerson"])
      .optional(),
    NOVA_POST_SENDER_COMPANY_NAME: optionalString,
    NOVA_POST_SENDER_COMPANY_TIN: optionalString,
    NOVA_POST_SENDER_COUNTRY_CODE: optionalString,
    NOVA_POST_SENDER_DIVISION_ID: optionalString,
    NOVA_POST_SENDER_EMAIL: optionalEmail,
    NOVA_POST_SENDER_NAME: optionalString,
    NOVA_POST_SENDER_PHONE: optionalString,
    NOVA_POSHTA_API_KEY: optionalString,
    NOVA_POSHTA_API_URL: optionalUrl,
    OWNER_SETUP_TOKEN: optionalSecret,
    SHIPPING_LABEL_CREATION_MODE: optionalShippingLabelCreationMode,
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

  })
  .transform((env) => ({
    ...env,
    SHIPPING_LABEL_CREATION_MODE:
      env.SHIPPING_LABEL_CREATION_MODE ??
      (env.NODE_ENV === "production" ? "disabled" : "mock"),
  }));

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type WebEnv = ServerEnv;
export type WorkerEnv = ServerEnv;
export type TestEnv = ServerEnv;
type EnvironmentInput = Record<string, string | undefined>;

export type WebEnvOptions = {
  requireOwnerSetupToken?: boolean;
};

let cachedEnv: ServerEnv | undefined;
let cachedDefaultWebEnv: WebEnv | undefined;
let cachedOwnerSetupWebEnv: WebEnv | undefined;
let cachedWorkerEnv: WorkerEnv | undefined;
let cachedTestEnv: TestEnv | undefined;

export function validateServerEnv(input: EnvironmentInput): ServerEnv {
  const result = serverEnvSchema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  throw createInvalidEnvironmentError(
    result.error.issues.map((issue) => ({
      message: issue.message,
      path: issue.path.join("."),
    })),
  );
}

export function validateWebEnv(
  input: EnvironmentInput,
  options: WebEnvOptions = {},
): WebEnv {
  const env = validateServerEnv(input);
  const issues: EnvironmentIssue[] = [];

  if (env.NODE_ENV === "production") {
    for (const key of [
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
    ] as const) {
      if (!env[key]) {
        issues.push({
          message: `${key} is required for web production`,
          path: key,
        });
      }
    }

    if (env.BETTER_AUTH_URL) {
      const authUrlIssue = getPublicProductionUrlIssue(
        env.BETTER_AUTH_URL,
        "BETTER_AUTH_URL",
      );

      if (authUrlIssue) {
        issues.push(authUrlIssue);
      }
    }

    if (options.requireOwnerSetupToken && !env.OWNER_SETUP_TOKEN) {
      issues.push({
        message:
          "OWNER_SETUP_TOKEN is required when first-owner setup is enabled in production",
        path: "OWNER_SETUP_TOKEN",
      });
    }
  }

  if (issues.length > 0) {
    throw createInvalidEnvironmentError(issues);
  }

  return env;
}

export function validateWorkerEnv(input: EnvironmentInput): WorkerEnv {
  const env = validateServerEnv(input);
  const issues: EnvironmentIssue[] = [];

  if (env.NODE_ENV === "production") {
    if (!env.DATABASE_URL) {
      issues.push({
        message: "DATABASE_URL is required for worker production",
        path: "DATABASE_URL",
      });
    }

    if (!isProvided(input.AUTO_COMPLETE_AFTER_DELIVERED_HOURS)) {
      issues.push({
        message:
          "AUTO_COMPLETE_AFTER_DELIVERED_HOURS is required for worker production",
        path: "AUTO_COMPLETE_AFTER_DELIVERED_HOURS",
      });
    }
  }

  if (issues.length > 0) {
    throw createInvalidEnvironmentError(issues);
  }

  return env;
}

export function validateTestEnv(input: EnvironmentInput): TestEnv {
  const env = validateServerEnv({
    ...input,
    NODE_ENV: input.NODE_ENV ?? "test",
  });

  if (env.NODE_ENV === "production") {
    throw createInvalidEnvironmentError([
      {
        message: "NODE_ENV=production is not allowed for test env",
        path: "NODE_ENV",
      },
    ]);
  }

  return env;
}

/**
 * Parses shared server settings only. Runtime entrypoints should prefer
 * getWebEnv(), getWorkerEnv(), or getTestEnv() so production requirements stay
 * scoped to the process that actually needs them.
 */
export function getServerEnv(): ServerEnv {
  cachedEnv ??= validateServerEnv(process.env);
  return cachedEnv;
}

export function getWebEnv(options: WebEnvOptions = {}): WebEnv {
  if (options.requireOwnerSetupToken) {
    cachedOwnerSetupWebEnv ??= validateWebEnv(process.env, options);
    return cachedOwnerSetupWebEnv;
  }

  cachedDefaultWebEnv ??= validateWebEnv(process.env, options);
  return cachedDefaultWebEnv;
}

export function getWorkerEnv(): WorkerEnv {
  cachedWorkerEnv ??= validateWorkerEnv(process.env);
  return cachedWorkerEnv;
}

export function getTestEnv(): TestEnv {
  cachedTestEnv ??= validateTestEnv(process.env);
  return cachedTestEnv;
}

export function resetServerEnvForTests(): void {
  cachedEnv = undefined;
  cachedDefaultWebEnv = undefined;
  cachedOwnerSetupWebEnv = undefined;
  cachedWorkerEnv = undefined;
  cachedTestEnv = undefined;
}

export function isLocalhostUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    const normalizedHost = hostname.toLowerCase();

    return (
      normalizedHost === "localhost" ||
      normalizedHost.endsWith(".localhost") ||
      normalizedHost === "0.0.0.0" ||
      normalizedHost === "::1" ||
      normalizedHost === "[::1]" ||
      normalizedHost.startsWith("127.")
    );
  } catch {
    return false;
  }
}

export function isInternalRailwayUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    const normalizedHost = hostname.toLowerCase();

    return (
      normalizedHost === "railway.internal" ||
      normalizedHost.endsWith(".railway.internal")
    );
  } catch {
    return false;
  }
}

type EnvironmentIssue = {
  message: string;
  path: string;
};

function getPublicProductionUrlIssue(
  value: string,
  key: string,
): EnvironmentIssue | null {
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    isLocalhostUrl(value) ||
    isInternalRailwayUrl(value) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    return {
      message:
        `${key} must be a public HTTPS origin in production and cannot point to localhost, loopback, or an internal Railway domain`,
      path: key,
    };
  }

  return null;
}

function createInvalidEnvironmentError(issues: EnvironmentIssue[]): Error {
  const details = issues
    .map((issue) => `${issue.path || "environment"}: ${issue.message}`)
    .join("; ");

  return new Error(`Invalid environment configuration: ${details}`);
}

function isProvided(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
