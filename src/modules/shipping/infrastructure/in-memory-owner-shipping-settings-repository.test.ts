import { InMemoryOwnerShippingSettingsRepository } from "@/modules/shipping/infrastructure/in-memory-owner-shipping-settings-repository";

const settingsInput = {
  apiBaseUrl: "https://api-stage.novapost.pl/v.1.0/",
  apiEnvironment: "stage",
  apiKeyEncrypted: "v1:encrypted",
  apiKeyPreview: "****7890",
  authUrl: null,
  carrier: "NOVA_POST",
  defaultActualWeightGrams: 500,
  defaultHeightMm: 100,
  defaultLengthMm: 300,
  defaultVolumetricWeightGrams: 500,
  defaultWidthMm: 200,
  isEnabled: true,
  ownerId: "owner-1",
  payerContractNumber: null,
  payerType: "Recipient",
  senderCompanyName: null,
  senderCompanyTin: null,
  senderCountryCode: "UA",
  senderDivisionId: "11759",
  senderEmail: null,
  senderName: "Тестова Тетяна",
  senderPhone: "380007654321",
} as const;

describe("InMemoryOwnerShippingSettingsRepository", () => {
  it("saves, finds, lists, and updates owner shipping settings", async () => {
    const repository = new InMemoryOwnerShippingSettingsRepository();
    const saved = await repository.save(settingsInput);

    await repository.save({
      ...settingsInput,
      ownerId: "owner-2",
      senderDivisionId: "owner-2-division",
    });
    await expect(repository.findByOwnerId("owner-1")).resolves.toMatchObject({
      apiKeyEncrypted: "v1:encrypted",
      carrier: "NOVA_POST",
      id: saved.id,
    });

    await repository.update({
      ...settingsInput,
      apiKeyEncrypted: "v1:updated",
      apiKeyPreview: "****1234",
      defaultWidthMm: 220,
      ownerId: "owner-1",
      settingsId: saved.id,
    });

    await expect(repository.listByOwnerId("owner-1")).resolves.toMatchObject([
      {
        apiKeyEncrypted: "v1:updated",
        apiKeyPreview: "****1234",
        defaultWidthMm: 220,
      },
    ]);
    await expect(
      repository.update({
        ...settingsInput,
        ownerId: "owner-2",
        settingsId: saved.id,
      }),
    ).resolves.toBeNull();
  });
});
