import { resetServerEnvForTests } from "@/shared/config/env";
import { FixtureShippingCarrier } from "@/modules/shipping/infrastructure/fixture-shipping-carrier";
import { NovaPoshtaShippingCarrier } from "@/modules/shipping/infrastructure/nova-poshta-shipping-carrier";
import { UkrposhtaShippingCarrier } from "@/modules/shipping/infrastructure/ukrposhta-shipping-carrier";
import { getShippingCarrier } from "@/modules/shipping/infrastructure/shipping-carrier-factory";

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
    vi.stubEnv("NOVA_POSHTA_API_KEY", "nova-key");
    vi.stubEnv("UKRPOSHTA_BEARER_TOKEN", "ukr-token");

    expect(getShippingCarrier("NOVA_POSHTA")).toBeInstanceOf(
      NovaPoshtaShippingCarrier,
    );
    expect(getShippingCarrier("UKRPOSHTA")).toBeInstanceOf(
      UkrposhtaShippingCarrier,
    );
  });

  it("requires carrier credentials outside mock mode", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getShippingCarrier("NOVA_POSHTA")).toThrow(
      /NOVA_POSHTA_API_KEY/,
    );
  });
});
