import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));
const optionalSecret = z.string().min(32).optional().or(z.literal(""));

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
    NOVA_POSHTA_API_KEY: z.string().optional(),
    NOVA_POSHTA_API_URL: optionalUrl,
    OWNER_SETUP_TOKEN: optionalSecret,
    UKRPOSHTA_API_URL: optionalUrl,
    UKRPOSHTA_BEARER_TOKEN: z.string().optional(),
    UKRPOSHTA_COUNTERPARTY_TOKEN: z.string().optional(),
  })
  .superRefine((env, context) => {
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
    NOVA_POSHTA_API_URL: env.NOVA_POSHTA_API_URL || undefined,
    OWNER_SETUP_TOKEN: env.OWNER_SETUP_TOKEN || undefined,
    UKRPOSHTA_API_URL: env.UKRPOSHTA_API_URL || undefined,
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
