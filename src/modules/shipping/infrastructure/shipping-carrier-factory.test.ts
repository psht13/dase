import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { OwnerShippingSettingsRecord } from "@/modules/shipping/application/owner-shipping-settings-repository";
import { ShippingCarrierSettingsUnavailableError } from "@/modules/shipping/application/shipping-carrier";
import { FixtureShippingCarrier } from "@/modules/shipping/infrastructure/fixture-shipping-carrier";
import { NovaPostShippingCarrier } from "@/modules/shipping/infrastructure/nova-post-shipping-carrier";
import {
  createNovaPostRuntimeConfigFromOwnerSettings,
  createNovaPostShippingCarrier,
  getShippingLabelCreationMode,
} from "@/modules/shipping/infrastructure/shipping-carrier-factory";
import { resetServerEnvForTests } from "@/shared/config/env";

describe("owner-scoped Nova Post carrier construction", () => {
  afterEach(() => {
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("builds Nova Post runtime config from decrypted owner settings", async () => {
    const decrypt = vi.fn(async () => "owner-nova-post-key");
    const runtimeConfig = await createNovaPostRuntimeConfigFromOwnerSettings(
      createOwnerSettings({
        apiKeyEncrypted: "encrypted-owner-key",
      }),
      {
        decrypt,
        encrypt: vi.fn(),
      },
    );

    expect(decrypt).toHaveBeenCalledWith("encrypted-owner-key");
    expect(runtimeConfig).toMatchObject({
      apiKey: "owner-nova-post-key",
      authUrl: "https://api-stage.novapost.pl/v.1.0/clients/authorization/",
      baseUrl: "https://api-stage.novapost.pl/v.1.0/",
      sender: expect.objectContaining({
        countryCode: "UA",
        divisionId: "11759",
        name: "Олена Петренко",
        payerType: "Recipient",
        phone: "+380671234567",
      }),
      shipmentDefaults: expect.objectContaining({
        actualWeightGrams: 500,
        heightMm: 100,
        lengthMm: 300,
        volumetricWeightGrams: 500,
        widthMm: 200,
      }),
    });
    expect(createNovaPostShippingCarrier(runtimeConfig)).toBeInstanceOf(
      NovaPostShippingCarrier,
    );
  });

  it("does not build carriers when owner settings are missing, disabled, or lack an API key", async () => {
    const encryptionService = {
      decrypt: vi.fn(async () => "owner-nova-post-key"),
      encrypt: vi.fn(),
    };

    await expect(
      createNovaPostRuntimeConfigFromOwnerSettings(null, encryptionService),
    ).rejects.toBeInstanceOf(ShippingCarrierSettingsUnavailableError);
    await expect(
      createNovaPostRuntimeConfigFromOwnerSettings(
        createOwnerSettings({ isEnabled: false }),
        encryptionService,
      ),
    ).rejects.toBeInstanceOf(ShippingCarrierSettingsUnavailableError);
    await expect(
      createNovaPostRuntimeConfigFromOwnerSettings(
        createOwnerSettings({ apiKeyEncrypted: null }),
        encryptionService,
      ),
    ).rejects.toBeInstanceOf(ShippingCarrierSettingsUnavailableError);
    expect(encryptionService.decrypt).not.toHaveBeenCalled();
  });

  it("defaults local label creation to mock mode", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(getShippingLabelCreationMode()).toBe("mock");
    expect(new FixtureShippingCarrier("NOVA_POSHTA")).toBeInstanceOf(
      FixtureShippingCarrier,
    );
  });

  it("keeps deprecated Nova Post env keys out of active shipping code", () => {
    const productionFiles = listProductionShippingFiles(
      join(process.cwd(), "src/modules/shipping"),
    );
    const deprecatedPattern =
      /NOVA_POST_(?:API_KEY|API_URL|AUTH_URL|SENDER_|PAYER_|DEFAULT_)|NOVA_POSHTA_API_(?:KEY|URL)/;
    const offenders = productionFiles.filter((filePath) =>
      deprecatedPattern.test(readFileSync(filePath, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});

function createOwnerSettings(
  input: Partial<OwnerShippingSettingsRecord> = {},
): OwnerShippingSettingsRecord {
  const now = new Date("2026-05-10T10:00:00.000Z");

  return {
    apiBaseUrl: "https://api-stage.novapost.pl/v.1.0/",
    apiEnvironment: "stage",
    apiKeyEncrypted: "encrypted-owner-key",
    apiKeyPreview: "****7890",
    authUrl: "https://api-stage.novapost.pl/v.1.0/clients/authorization/",
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
    senderCompanyName: "Dase Jewelry",
    senderCompanyTin: "12345678",
    senderCountryCode: "UA",
    senderDivisionId: "11759",
    senderEmail: "olena@example.com",
    senderName: "Олена Петренко",
    senderPhone: "+380671234567",
    updatedAt: now,
    ...input,
  };
}

function listProductionShippingFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = join(directory, entry);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      return listProductionShippingFiles(filePath);
    }

    if (!filePath.endsWith(".ts") || filePath.endsWith(".test.ts")) {
      return [];
    }

    return [filePath];
  });
}
