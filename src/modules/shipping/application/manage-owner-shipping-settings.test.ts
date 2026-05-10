import type { ApplicationEncryptionService } from "@/modules/shipping/application/application-encryption-service";
import {
  getOwnerShippingSettingsUseCase,
  listOwnerShippingSettingsUseCase,
  saveOwnerShippingSettingsUseCase,
} from "@/modules/shipping/application/manage-owner-shipping-settings";
import { InMemoryOwnerShippingSettingsRepository } from "@/modules/shipping/infrastructure/in-memory-owner-shipping-settings-repository";
import { createApplicationEncryptionServiceFromEnv } from "@/modules/shipping/infrastructure/node-application-encryption-service";

const validInput = {
  apiBaseUrl: "https://api-stage.novapost.pl/v.1.0/",
  apiEnvironment: "stage",
  apiKey: "owner-nova-post-secret-7890",
  authUrl: "",
  defaultActualWeightGrams: 500,
  defaultHeightMm: 100,
  defaultLengthMm: 300,
  defaultVolumetricWeightGrams: 500,
  defaultWidthMm: 200,
  isEnabled: true,
  ownerId: "owner-1",
  payerContractNumber: "",
  payerType: "Recipient",
  senderCompanyName: "",
  senderCompanyTin: "",
  senderCountryCode: "UA",
  senderDivisionId: "11759",
  senderEmail: "",
  senderName: "Тестова Тетяна",
  senderPhone: "380007654321",
} as const;

const fakeEncryptionService: ApplicationEncryptionService = {
  decrypt: vi.fn(async (ciphertext) => ciphertext.replace("encrypted:", "")),
  encrypt: vi.fn(async (plaintext) => `encrypted:${plaintext}`),
};

describe("owner shipping settings use cases", () => {
  it("saves encrypted API key metadata without returning the secret to UI read models", async () => {
    const repository = new InMemoryOwnerShippingSettingsRepository();

    const saved = await saveOwnerShippingSettingsUseCase(validInput, {
      encryptionService: fakeEncryptionService,
      ownerShippingSettingsRepository: repository,
    });

    expect(saved.apiKeyConfigured).toBe(true);
    expect(saved.apiKeyPreview).toBe("****7890");
    expect(saved.apiKeyPreview).not.toContain("owner-nova-post-secret");
    expect(saved).not.toHaveProperty("apiKey");
    expect(saved).not.toHaveProperty("apiKeyEncrypted");

    const stored = await repository.findByOwnerId("owner-1");

    expect(stored?.apiKeyEncrypted).toBe(
      "encrypted:owner-nova-post-secret-7890",
    );
  });

  it("updates settings while preserving the encrypted key when no new key is submitted", async () => {
    const repository = new InMemoryOwnerShippingSettingsRepository();

    await saveOwnerShippingSettingsUseCase(validInput, {
      encryptionService: fakeEncryptionService,
      ownerShippingSettingsRepository: repository,
    });
    const updated = await saveOwnerShippingSettingsUseCase(
      {
        ...validInput,
        apiKey: undefined,
        defaultWidthMm: 220,
        isEnabled: false,
      },
      {
        encryptionService: fakeEncryptionService,
        ownerShippingSettingsRepository: repository,
      },
    );

    expect(updated.apiKeyConfigured).toBe(true);
    expect(updated.apiKeyPreview).toBe("****7890");
    expect(updated.defaultWidthMm).toBe(220);
    expect(updated.isEnabled).toBe(false);
    await expect(
      listOwnerShippingSettingsUseCase(
        { ownerId: "owner-1" },
        {
          ownerShippingSettingsRepository: repository,
        },
      ),
    ).resolves.toHaveLength(1);
    await expect(
      getOwnerShippingSettingsUseCase(
        { ownerId: "owner-1" },
        {
          ownerShippingSettingsRepository: repository,
        },
      ),
    ).resolves.toMatchObject({ defaultWidthMm: 220 });
  });

  it("rejects missing or invalid APP_ENCRYPTION_KEY in production when saving an API key", async () => {
    for (const APP_ENCRYPTION_KEY of [undefined, "not-valid-key"]) {
      const repository = new InMemoryOwnerShippingSettingsRepository();

      await expect(async () => {
        const encryptionService = createApplicationEncryptionServiceFromEnv({
          APP_ENCRYPTION_KEY,
          NODE_ENV: "production",
        });

        await saveOwnerShippingSettingsUseCase(validInput, {
          encryptionService,
          ownerShippingSettingsRepository: repository,
        });
      }).rejects.toThrow(/APP_ENCRYPTION_KEY/);
    }
  });
});
