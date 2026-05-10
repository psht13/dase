import { DrizzleOwnerShippingSettingsRepository } from "@/modules/shipping/infrastructure/drizzle-owner-shipping-settings-repository";
import type * as schema from "@/shared/db/schema";

function createSelectChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    limit: vi.fn(async () => result),
    orderBy: vi.fn(async () => result),
    where: vi.fn(() => chain),
  };

  return chain;
}

function createUpdateChain<T>(result: T) {
  const chain = {
    returning: vi.fn(async () => result),
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
  };

  return chain;
}

describe("DrizzleOwnerShippingSettingsRepository", () => {
  const now = new Date("2026-05-10T00:00:00.000Z");
  const settings = {
    apiBaseUrl: "https://api-stage.novapost.pl/v.1.0/",
    apiEnvironment: "stage",
    apiKeyEncrypted: "v1:encrypted",
    apiKeyPreview: "****7890",
    authUrl: null,
    carrier: "NOVA_POST",
    createdAt: now,
    defaultActualWeightGrams: 500,
    defaultHeightMm: 100,
    defaultLengthMm: 300,
    defaultVolumetricWeightGrams: 500,
    defaultWidthMm: 200,
    id: "settings-1",
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
    updatedAt: now,
  } satisfies typeof schema.ownerShippingSettings.$inferSelect;

  it("finds and lists owner shipping settings", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectChain([settings]))
        .mockReturnValueOnce(createSelectChain([settings])),
    };
    const repository = new DrizzleOwnerShippingSettingsRepository(db as never);

    await expect(repository.findByOwnerId("owner-1")).resolves.toMatchObject({
      apiKeyEncrypted: "v1:encrypted",
      carrier: "NOVA_POST",
    });
    await expect(repository.listByOwnerId("owner-1")).resolves.toMatchObject([
      {
        apiKeyPreview: "****7890",
        ownerId: "owner-1",
      },
    ]);
  });

  it("saves and updates owner shipping settings", async () => {
    const insert = {
      values: vi.fn(() => ({
        returning: vi.fn(async () => [settings]),
      })),
    };
    const update = createUpdateChain([settings]);
    const db = {
      insert: vi.fn(() => insert),
      update: vi.fn(() => update),
    };
    const repository = new DrizzleOwnerShippingSettingsRepository(db as never);

    await repository.save(settings);
    await repository.update({
      ...settings,
      apiKeyEncrypted: "v1:updated",
      apiKeyPreview: "****1234",
      defaultWidthMm: 220,
      settingsId: "settings-1",
    });

    expect(insert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyEncrypted: "v1:encrypted",
        carrier: "NOVA_POST",
        ownerId: "owner-1",
      }),
    );
    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyEncrypted: "v1:updated",
        apiKeyPreview: "****1234",
        defaultWidthMm: 220,
      }),
    );
  });
});
