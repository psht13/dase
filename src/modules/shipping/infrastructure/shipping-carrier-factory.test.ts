import { resetServerEnvForTests } from "@/shared/config/env";
import { FixtureShippingCarrier } from "@/modules/shipping/infrastructure/fixture-shipping-carrier";
import { NovaPostShippingCarrier } from "@/modules/shipping/infrastructure/nova-post-shipping-carrier";
import {
  getMissingNovaPostLiveShipmentConfigKeys,
  getShippingCarrier,
  getShippingLabelCreationMode,
  validateLiveShipmentCreationConfig,
} from "@/modules/shipping/infrastructure/shipping-carrier-factory";

describe("getShippingCarrier", () => {
  afterEach(() => {
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("uses fixture carriers for Playwright e2e", () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(getShippingCarrier("NOVA_POSHTA")).toBeInstanceOf(
      FixtureShippingCarrier,
    );
  });

  it("creates real adapters when credentials are configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SHIPPING_LABEL_CREATION_MODE", "live");
    vi.stubEnv("NOVA_POST_API_KEY", "nova-key");
    stubCompleteNovaPostLiveConfig();

    expect(getShippingCarrier("NOVA_POSHTA")).toBeInstanceOf(
      NovaPostShippingCarrier,
    );
  });

  it("lets explicit live mode override local mock carrier flags", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SHIPPING_LABEL_CREATION_MODE", "live");
    vi.stubEnv("USE_MOCK_SHIPPING_CARRIERS", "1");
    vi.stubEnv("NOVA_POST_API_KEY", "nova-key");
    stubCompleteNovaPostLiveConfig();

    expect(getShippingCarrier("NOVA_POSHTA")).toBeInstanceOf(
      NovaPostShippingCarrier,
    );
  });

  it("rejects disabled carriers even when mock mode is enabled", () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getShippingCarrier("UKRPOSHTA")).toThrow(
      /Shipping carrier is disabled/,
    );
  });

  it("requires carrier credentials outside mock mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SHIPPING_LABEL_CREATION_MODE", "live");
    stubCompleteNovaPostLiveConfig();
    vi.stubEnv("NOVA_POST_API_KEY", "");

    expect(() => getShippingCarrier("NOVA_POSHTA")).toThrow(
      /NOVA_POST_API_KEY/,
    );
  });

  it("temporarily accepts deprecated Nova Poshta env names", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SHIPPING_LABEL_CREATION_MODE", "live");
    vi.stubEnv("NOVA_POSHTA_API_KEY", "legacy-nova-key");
    stubCompleteNovaPostLiveConfig();

    expect(getShippingCarrier("NOVA_POSHTA")).toBeInstanceOf(
      NovaPostShippingCarrier,
    );
  });

  it("defaults local label creation to mock mode", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(getShippingLabelCreationMode()).toBe("mock");
  });

  it("reports missing Nova Post live shipment settings without secrets", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SHIPPING_LABEL_CREATION_MODE", "disabled");
    vi.stubEnv("NOVA_POST_API_KEY", "secret-api-key");
    vi.stubEnv("NOVA_POST_SENDER_NAME", "Таємний відправник");
    const validation = validateLiveShipmentCreationConfig("NOVA_POSHTA");

    expect(validation).toEqual({
      missingKeys: expect.arrayContaining([
        "NOVA_POST_SENDER_DIVISION_ID",
        "NOVA_POST_SENDER_PHONE",
      ]),
      ok: false,
      reason: expect.stringContaining("Налаштування Нова пошта"),
    });
    expect(validation.ok).toBe(false);
    if (validation.ok) {
      throw new Error("Expected missing Nova Post config");
    }
    expect(
      getMissingNovaPostLiveShipmentConfigKeys(getCompleteEnvForLiveConfig()),
    ).toEqual([]);
    expect(validation.reason).not.toContain("secret-api-key");
    expect(validation.reason).not.toContain("Таємний відправник");
  });
});

function stubCompleteNovaPostLiveConfig() {
  vi.stubEnv("NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS", "500");
  vi.stubEnv("NOVA_POST_DEFAULT_HEIGHT_MM", "100");
  vi.stubEnv("NOVA_POST_DEFAULT_LENGTH_MM", "300");
  vi.stubEnv("NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS", "500");
  vi.stubEnv("NOVA_POST_DEFAULT_WIDTH_MM", "200");
  vi.stubEnv("NOVA_POST_PAYER_TYPE", "Recipient");
  vi.stubEnv("NOVA_POST_SENDER_COUNTRY_CODE", "UA");
  vi.stubEnv("NOVA_POST_SENDER_DIVISION_ID", "11759");
  vi.stubEnv("NOVA_POST_SENDER_NAME", "Тестова Тетяна");
  vi.stubEnv("NOVA_POST_SENDER_PHONE", "380007654321");
}

function getCompleteEnvForLiveConfig() {
  return {
    AUTO_COMPLETE_AFTER_DELIVERED_HOURS: 24,
    BETTER_AUTH_SECRET: undefined,
    BETTER_AUTH_URL: undefined,
    DATABASE_URL: undefined,
    DATABASE_URL_TEST: undefined,
    MONOBANK_API_URL: undefined,
    NODE_ENV: "development" as const,
    NOVA_POST_API_KEY: "nova-key",
    NOVA_POST_API_URL: undefined,
    NOVA_POST_AUTH_URL: undefined,
    NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS: 500,
    NOVA_POST_DEFAULT_HEIGHT_MM: 100,
    NOVA_POST_DEFAULT_LENGTH_MM: 300,
    NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS: 500,
    NOVA_POST_DEFAULT_WIDTH_MM: 200,
    NOVA_POST_PAYER_CONTRACT_NUMBER: undefined,
    NOVA_POST_PAYER_TYPE: "Recipient" as const,
    NOVA_POST_SENDER_COMPANY_NAME: undefined,
    NOVA_POST_SENDER_COMPANY_TIN: undefined,
    NOVA_POST_SENDER_COUNTRY_CODE: "UA",
    NOVA_POST_SENDER_DIVISION_ID: "11759",
    NOVA_POST_SENDER_EMAIL: undefined,
    NOVA_POST_SENDER_NAME: "Тестова Тетяна",
    NOVA_POST_SENDER_PHONE: "380007654321",
    NOVA_POSHTA_API_KEY: undefined,
    NOVA_POSHTA_API_URL: undefined,
    OWNER_SETUP_TOKEN: undefined,
    SHIPPING_LABEL_CREATION_MODE: "live" as const,
  };
}
