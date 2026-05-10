import type { ApplicationEncryptionService } from "@/modules/shipping/application/application-encryption-service";
import {
  migrateOwnerShippingSettingsFromEnvUseCase,
  ownerShippingSettingsInputFromDeprecatedEnv,
  parseMigrateShippingEnvArgs,
} from "@/modules/shipping/application/migrate-owner-shipping-env";
import { InMemoryOwnerShippingSettingsRepository } from "@/modules/shipping/infrastructure/in-memory-owner-shipping-settings-repository";
import type {
  UserRecord,
  UserRepository,
} from "@/modules/users/application/user-repository";

const owner = {
  createdAt: new Date("2026-05-10T00:00:00.000Z"),
  email: "owner@example.com",
  emailVerified: true,
  id: "owner-1",
  image: null,
  name: "Owner",
  role: "owner",
  updatedAt: new Date("2026-05-10T00:00:00.000Z"),
} satisfies UserRecord;

const regularUser = {
  ...owner,
  email: "user@example.com",
  id: "user-1",
  role: "user",
} satisfies UserRecord;

const deprecatedEnv = {
  NOVA_POST_API_KEY: "stage-secret-key-7890",
  NOVA_POST_API_URL: "https://api-stage.novapost.pl/v.1.0/",
  NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS: "600",
  NOVA_POST_DEFAULT_HEIGHT_MM: "120",
  NOVA_POST_DEFAULT_LENGTH_MM: "320",
  NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS: "700",
  NOVA_POST_DEFAULT_WIDTH_MM: "220",
  NOVA_POST_PAYER_TYPE: "Recipient",
  NOVA_POST_SENDER_COUNTRY_CODE: "UA",
  NOVA_POST_SENDER_DIVISION_ID: "11759",
  NOVA_POST_SENDER_NAME: "Test Sender",
  NOVA_POST_SENDER_PHONE: "380007654321",
} satisfies Record<string, string>;

const fakeEncryptionService: ApplicationEncryptionService = {
  decrypt: vi.fn(async (ciphertext) => ciphertext.replace("encrypted:", "")),
  encrypt: vi.fn(async (plaintext) => `encrypted:${plaintext}`),
};

describe("shipping env migration parser", () => {
  it("parses owner selector and explicit overwrite flags", () => {
    expect(
      parseMigrateShippingEnvArgs([
        "--",
        "--owner-email",
        "owner@example.com",
        "--force",
      ]),
    ).toEqual({
      allowProduction: false,
      force: true,
      help: false,
      ownerEmail: "owner@example.com",
    });
    expect(
      parseMigrateShippingEnvArgs([
        "--owner-id=owner-1",
        "--allow-production",
      ]),
    ).toEqual({
      allowProduction: true,
      force: false,
      help: false,
      ownerId: "owner-1",
    });
  });

  it("requires exactly one owner selector", () => {
    expect(() => parseMigrateShippingEnvArgs([])).toThrow(/--owner-email/);
    expect(() =>
      parseMigrateShippingEnvArgs([
        "--owner-email",
        "owner@example.com",
        "--owner-id",
        "owner-1",
      ]),
    ).toThrow(/exactly one/);
  });
});

describe("owner shipping env migration use case", () => {
  it("creates owner settings from deprecated env without exposing the full API key", async () => {
    const repository = new InMemoryOwnerShippingSettingsRepository();

    const result = await migrateOwnerShippingSettingsFromEnvUseCase(
      {
        env: deprecatedEnv,
        nodeEnv: "test",
        ownerEmail: "OWNER@example.com",
      },
      {
        encryptionService: fakeEncryptionService,
        ownerShippingSettingsRepository: repository,
        userRepository: createUserRepository([owner]),
      },
    );

    expect(result).toMatchObject({
      action: "created",
      apiKeyPreview: "****7890",
      ownerEmail: "owner@example.com",
      ownerId: "owner-1",
    });
    expect(JSON.stringify(result)).not.toContain("stage-secret-key");

    const stored = await repository.findByOwnerId("owner-1");

    expect(stored?.apiKeyEncrypted).toBe("encrypted:stage-secret-key-7890");
    expect(stored?.apiKeyPreview).toBe("****7890");
    expect(stored?.defaultWidthMm).toBe(220);
  });

  it("refuses to overwrite existing owner settings unless force is passed", async () => {
    const repository = new InMemoryOwnerShippingSettingsRepository();
    const dependencies = {
      encryptionService: fakeEncryptionService,
      ownerShippingSettingsRepository: repository,
      userRepository: createUserRepository([owner]),
    };

    await migrateOwnerShippingSettingsFromEnvUseCase(
      {
        env: deprecatedEnv,
        nodeEnv: "test",
        ownerId: "owner-1",
      },
      dependencies,
    );

    await expect(
      migrateOwnerShippingSettingsFromEnvUseCase(
        {
          env: {
            ...deprecatedEnv,
            NOVA_POST_DEFAULT_WIDTH_MM: "240",
          },
          nodeEnv: "test",
          ownerId: "owner-1",
        },
        dependencies,
      ),
    ).rejects.toThrow(/--force/);

    await expect(
      migrateOwnerShippingSettingsFromEnvUseCase(
        {
          env: {
            ...deprecatedEnv,
            NOVA_POST_DEFAULT_WIDTH_MM: "240",
          },
          force: true,
          nodeEnv: "test",
          ownerId: "owner-1",
        },
        dependencies,
      ),
    ).resolves.toMatchObject({
      action: "updated",
      apiKeyPreview: "****7890",
    });

    await expect(repository.findByOwnerId("owner-1")).resolves.toMatchObject({
      defaultWidthMm: 240,
    });
  });

  it("refuses missing, non-owner, and production runs by default", async () => {
    const dependencies = {
      encryptionService: fakeEncryptionService,
      ownerShippingSettingsRepository:
        new InMemoryOwnerShippingSettingsRepository(),
      userRepository: createUserRepository([owner, regularUser]),
    };

    await expect(
      migrateOwnerShippingSettingsFromEnvUseCase(
        {
          env: deprecatedEnv,
          nodeEnv: "test",
          ownerEmail: "missing@example.com",
        },
        dependencies,
      ),
    ).rejects.toThrow(/Owner was not found/);
    await expect(
      migrateOwnerShippingSettingsFromEnvUseCase(
        {
          env: deprecatedEnv,
          nodeEnv: "test",
          ownerId: "user-1",
        },
        dependencies,
      ),
    ).rejects.toThrow(/Owner was not found/);
    await expect(
      migrateOwnerShippingSettingsFromEnvUseCase(
        {
          env: deprecatedEnv,
          nodeEnv: "production",
          ownerId: "owner-1",
        },
        dependencies,
      ),
    ).rejects.toThrow(/NODE_ENV=production/);
  });

  it("requires the deprecated API key and complete owner sender values", () => {
    expect(() =>
      ownerShippingSettingsInputFromDeprecatedEnv("owner-1", {
        NOVA_POST_SENDER_DIVISION_ID: "11759",
        NOVA_POST_SENDER_NAME: "Test Sender",
        NOVA_POST_SENDER_PHONE: "380007654321",
      }),
    ).toThrow(/NOVA_POST_API_KEY/);
    expect(() =>
      ownerShippingSettingsInputFromDeprecatedEnv("owner-1", {
        NOVA_POST_API_KEY: "stage-secret-key-7890",
        NOVA_POST_SENDER_NAME: "Test Sender",
        NOVA_POST_SENDER_PHONE: "380007654321",
      }),
    ).toThrow(/NOVA_POST_SENDER_DIVISION_ID/);
  });
});

function createUserRepository(users: UserRecord[]): UserRepository {
  return {
    countByRole: vi.fn(async (role) =>
      users.filter((user) => user.role === role).length,
    ),
    findByEmail: vi.fn(async (email) => {
      const normalizedEmail = email.toLowerCase();

      return (
        users.find((user) => user.email.toLowerCase() === normalizedEmail) ??
        null
      );
    }),
    findById: vi.fn(async (id) => users.find((user) => user.id === id) ?? null),
    updateRole: vi.fn(async () => {
      throw new Error("Not implemented");
    }),
  };
}
