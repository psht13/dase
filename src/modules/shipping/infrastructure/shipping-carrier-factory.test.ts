import { resetServerEnvForTests } from "@/shared/config/env";
import { FixtureShippingCarrier } from "@/modules/shipping/infrastructure/fixture-shipping-carrier";
import { NovaPostShippingCarrier } from "@/modules/shipping/infrastructure/nova-post-shipping-carrier";
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
    vi.stubEnv("NOVA_POST_API_KEY", "nova-key");

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

    expect(() => getShippingCarrier("NOVA_POSHTA")).toThrow(
      /NOVA_POST_API_KEY/,
    );
  });

  it("temporarily accepts deprecated Nova Poshta env names", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NOVA_POSHTA_API_KEY", "legacy-nova-key");

    expect(getShippingCarrier("NOVA_POSHTA")).toBeInstanceOf(
      NovaPostShippingCarrier,
    );
  });
});
