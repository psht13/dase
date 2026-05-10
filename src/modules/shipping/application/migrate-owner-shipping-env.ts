import type { ApplicationEncryptionService } from "@/modules/shipping/application/application-encryption-service";
import { saveOwnerShippingSettingsUseCase } from "@/modules/shipping/application/manage-owner-shipping-settings";
import type { OwnerShippingSettingsRepository } from "@/modules/shipping/application/owner-shipping-settings-repository";
import type { OwnerShippingSettingsInput } from "@/modules/shipping/application/owner-shipping-settings-validation";
import {
  type NovaPostApiEnvironment,
  type NovaPostPayerType,
  normalizeNovaPostUrl,
  novaPostApiBaseUrls,
  novaPostPayerTypes,
  ownerShippingCarrier,
} from "@/modules/shipping/domain/owner-shipping-settings";
import type { UserRepository } from "@/modules/users/application/user-repository";

type EnvironmentInput = Record<string, string | undefined>;

export type MigrateShippingEnvCliOptions = {
  allowProduction: boolean;
  force: boolean;
  help: boolean;
  ownerEmail?: string;
  ownerId?: string;
};

export type MigrateOwnerShippingEnvInput = {
  allowProduction?: boolean;
  env: EnvironmentInput;
  force?: boolean;
  nodeEnv?: string;
  ownerEmail?: string;
  ownerId?: string;
};

export type MigrateOwnerShippingEnvDependencies = {
  encryptionService: ApplicationEncryptionService;
  ownerShippingSettingsRepository: OwnerShippingSettingsRepository;
  userRepository: UserRepository;
};

export type MigrateOwnerShippingEnvResult = {
  action: "created" | "updated";
  apiBaseUrl: string;
  apiEnvironment: NovaPostApiEnvironment;
  apiKeyPreview: string | null;
  isEnabled: boolean;
  ownerEmail: string;
  ownerId: string;
};

export class ShippingSettingsEnvMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShippingSettingsEnvMigrationError";
  }
}

export const migrateShippingEnvHelpText = `Usage:
  pnpm settings:migrate-shipping-env -- --owner-email owner@example.com
  pnpm settings:migrate-shipping-env -- --owner-id <owner-uuid>

Options:
  --owner-email <email>     Migrate settings for this owner email.
  --owner-id <id>           Migrate settings for this owner id.
  --force                   Overwrite existing owner shipping settings.
  --allow-production        Allow NODE_ENV=production after explicit approval.
  --help                    Show this help.

The helper reads deprecated Nova Post values from the current process env only.
It never prints the full API key and does not create shipments.`;

const deprecatedApiKeyKeys = ["NOVA_POST_API_KEY", "NOVA_POSHTA_API_KEY"];
const deprecatedApiUrlKeys = ["NOVA_POST_API_URL", "NOVA_POSHTA_API_URL"];

const defaultShippingSettings = {
  actualWeightGrams: 500,
  countryCode: "UA",
  heightMm: 100,
  lengthMm: 300,
  payerType: "Recipient" satisfies NovaPostPayerType,
  volumetricWeightGrams: 500,
  widthMm: 200,
};

export function parseMigrateShippingEnvArgs(
  args: string[],
): MigrateShippingEnvCliOptions {
  const options: MigrateShippingEnvCliOptions = {
    allowProduction: false,
    force: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--allow-production") {
      options.allowProduction = true;
      continue;
    }

    const ownerEmail = readFlagValue(args, index, "--owner-email");

    if (ownerEmail) {
      options.ownerEmail = ownerEmail.value;
      index = ownerEmail.nextIndex;
      continue;
    }

    const ownerId = readFlagValue(args, index, "--owner-id");

    if (ownerId) {
      options.ownerId = ownerId.value;
      index = ownerId.nextIndex;
      continue;
    }

    throw new ShippingSettingsEnvMigrationError(`Unknown option: ${arg}`);
  }

  if (options.help) {
    return options;
  }

  assertOwnerSelector(options);

  return options;
}

export async function migrateOwnerShippingSettingsFromEnvUseCase(
  input: MigrateOwnerShippingEnvInput,
  dependencies: MigrateOwnerShippingEnvDependencies,
): Promise<MigrateOwnerShippingEnvResult> {
  assertOwnerSelector(input);
  assertAllowedRuntime(input);

  const owner = input.ownerId
    ? await dependencies.userRepository.findById(input.ownerId.trim())
    : await dependencies.userRepository.findByEmail(
        input.ownerEmail?.trim().toLowerCase() ?? "",
      );

  if (!owner || owner.role !== "owner") {
    throw new ShippingSettingsEnvMigrationError(
      "Owner was not found for the provided selector",
    );
  }

  const existingSettings =
    await dependencies.ownerShippingSettingsRepository.findByOwnerId(owner.id);

  if (existingSettings && !input.force) {
    throw new ShippingSettingsEnvMigrationError(
      "Owner shipping settings already exist. Pass --force to overwrite them.",
    );
  }

  const migratedInput = ownerShippingSettingsInputFromDeprecatedEnv(
    owner.id,
    input.env,
  );
  const savedSettings = await saveOwnerShippingSettingsUseCase(migratedInput, {
    encryptionService: dependencies.encryptionService,
    ownerShippingSettingsRepository:
      dependencies.ownerShippingSettingsRepository,
  });

  return {
    action: existingSettings ? "updated" : "created",
    apiBaseUrl: savedSettings.apiBaseUrl,
    apiEnvironment: savedSettings.apiEnvironment,
    apiKeyPreview: savedSettings.apiKeyPreview,
    isEnabled: savedSettings.isEnabled,
    ownerEmail: owner.email,
    ownerId: owner.id,
  };
}

export function ownerShippingSettingsInputFromDeprecatedEnv(
  ownerId: string,
  env: EnvironmentInput,
): OwnerShippingSettingsInput {
  const apiKey = requireDeprecatedValue(env, deprecatedApiKeyKeys);
  const apiBaseUrl =
    readDeprecatedValue(env, deprecatedApiUrlKeys) ?? novaPostApiBaseUrls.stage;

  return {
    apiBaseUrl,
    apiEnvironment: inferNovaPostApiEnvironment(apiBaseUrl),
    apiKey,
    authUrl: readDeprecatedValue(env, ["NOVA_POST_AUTH_URL"]) ?? "",
    carrier: ownerShippingCarrier,
    defaultActualWeightGrams: readPositiveIntEnv(
      env,
      "NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS",
      defaultShippingSettings.actualWeightGrams,
    ),
    defaultHeightMm: readPositiveIntEnv(
      env,
      "NOVA_POST_DEFAULT_HEIGHT_MM",
      defaultShippingSettings.heightMm,
    ),
    defaultLengthMm: readPositiveIntEnv(
      env,
      "NOVA_POST_DEFAULT_LENGTH_MM",
      defaultShippingSettings.lengthMm,
    ),
    defaultVolumetricWeightGrams: readPositiveIntEnv(
      env,
      "NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS",
      defaultShippingSettings.volumetricWeightGrams,
    ),
    defaultWidthMm: readPositiveIntEnv(
      env,
      "NOVA_POST_DEFAULT_WIDTH_MM",
      defaultShippingSettings.widthMm,
    ),
    isEnabled: true,
    ownerId,
    payerContractNumber:
      readDeprecatedValue(env, ["NOVA_POST_PAYER_CONTRACT_NUMBER"]) ?? "",
    payerType: readNovaPostPayerType(env),
    senderCompanyName:
      readDeprecatedValue(env, ["NOVA_POST_SENDER_COMPANY_NAME"]) ?? "",
    senderCompanyTin:
      readDeprecatedValue(env, ["NOVA_POST_SENDER_COMPANY_TIN"]) ?? "",
    senderCountryCode:
      readDeprecatedValue(env, ["NOVA_POST_SENDER_COUNTRY_CODE"]) ??
      defaultShippingSettings.countryCode,
    senderDivisionId: requireDeprecatedValue(env, [
      "NOVA_POST_SENDER_DIVISION_ID",
    ]),
    senderEmail: readDeprecatedValue(env, ["NOVA_POST_SENDER_EMAIL"]) ?? "",
    senderName: requireDeprecatedValue(env, ["NOVA_POST_SENDER_NAME"]),
    senderPhone: requireDeprecatedValue(env, ["NOVA_POST_SENDER_PHONE"]),
  };
}

function readFlagValue(
  args: string[],
  index: number,
  flag: string,
): { nextIndex: number; value: string } | null {
  const arg = args[index];
  const assignmentPrefix = `${flag}=`;

  if (arg.startsWith(assignmentPrefix)) {
    const value = arg.slice(assignmentPrefix.length).trim();

    if (!value) {
      throw new ShippingSettingsEnvMigrationError(
        `${flag} requires a non-empty value`,
      );
    }

    return { nextIndex: index, value };
  }

  if (arg !== flag) {
    return null;
  }

  const value = args[index + 1]?.trim();

  if (!value || value.startsWith("--")) {
    throw new ShippingSettingsEnvMigrationError(
      `${flag} requires a non-empty value`,
    );
  }

  return { nextIndex: index + 1, value };
}

function assertOwnerSelector(input: {
  ownerEmail?: string;
  ownerId?: string;
}): void {
  const ownerEmail = input.ownerEmail?.trim();
  const ownerId = input.ownerId?.trim();

  if (Boolean(ownerEmail) === Boolean(ownerId)) {
    throw new ShippingSettingsEnvMigrationError(
      "Pass exactly one owner selector: --owner-email or --owner-id.",
    );
  }
}

function assertAllowedRuntime(input: MigrateOwnerShippingEnvInput): void {
  if (input.nodeEnv === "production" && !input.allowProduction) {
    throw new ShippingSettingsEnvMigrationError(
      "Refusing to run with NODE_ENV=production. Configure production manually through the dashboard unless this run is explicitly approved.",
    );
  }
}

function requireDeprecatedValue(
  env: EnvironmentInput,
  keys: string[],
): string {
  const value = readDeprecatedValue(env, keys);

  if (!value) {
    throw new ShippingSettingsEnvMigrationError(
      `Missing deprecated env value. Set ${keys.join(" or ")} in the current shell before running migration.`,
    );
  }

  return value;
}

function readDeprecatedValue(
  env: EnvironmentInput,
  keys: string[],
): string | undefined {
  const values = keys
    .map((key) => ({ key, value: env[key]?.trim() }))
    .filter(
      (entry): entry is { key: string; value: string } => Boolean(entry.value),
    );

  if (values.length === 0) {
    return undefined;
  }

  const [firstValue] = values;
  const hasConflict = values.some((entry) => entry.value !== firstValue.value);

  if (hasConflict) {
    throw new ShippingSettingsEnvMigrationError(
      `Conflicting deprecated env values are present: ${keys.join(", ")}. Keep only one value before running migration.`,
    );
  }

  return firstValue.value;
}

function readPositiveIntEnv(
  env: EnvironmentInput,
  key: string,
  fallback: number,
): number {
  const value = readDeprecatedValue(env, [key]);

  if (!value) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new ShippingSettingsEnvMigrationError(
      `${key} must be a positive integer`,
    );
  }

  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new ShippingSettingsEnvMigrationError(
      `${key} must be a positive integer`,
    );
  }

  return parsedValue;
}

function readNovaPostPayerType(env: EnvironmentInput): NovaPostPayerType {
  const payerType =
    readDeprecatedValue(env, ["NOVA_POST_PAYER_TYPE"]) ??
    defaultShippingSettings.payerType;

  if (novaPostPayerTypes.includes(payerType as NovaPostPayerType)) {
    return payerType as NovaPostPayerType;
  }

  throw new ShippingSettingsEnvMigrationError(
    "NOVA_POST_PAYER_TYPE must be Recipient, Sender, or ThirdPerson",
  );
}

function inferNovaPostApiEnvironment(
  apiBaseUrl: string,
): NovaPostApiEnvironment {
  const normalizedUrl = normalizeNovaPostUrl(apiBaseUrl);

  for (const [environment, officialUrl] of Object.entries(novaPostApiBaseUrls)) {
    if (officialUrl && normalizeNovaPostUrl(officialUrl) === normalizedUrl) {
      return environment as NovaPostApiEnvironment;
    }
  }

  return "custom";
}
