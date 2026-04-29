import {
  getMonobankPaymentProvider,
  resetPaymentProviderForTests,
} from "@/modules/payments/infrastructure/payment-provider-factory";
import { FixtureMonobankPaymentProvider } from "@/modules/payments/infrastructure/fixture-payment-provider";
import { MonobankPaymentProvider } from "@/modules/payments/infrastructure/monobank-payment-provider";
import { resetServerEnvForTests } from "@/shared/config/env";

describe("getMonobankPaymentProvider", () => {
  afterEach(() => {
    resetPaymentProviderForTests();
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("uses the Playwright fixture provider outside production", () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(getMonobankPaymentProvider()).toBeInstanceOf(
      FixtureMonobankPaymentProvider,
    );
  });

  it("creates a Monobank provider when secure settings are present", () => {
    vi.stubEnv("MONOBANK_TOKEN", "test-token");
    vi.stubEnv("MONOBANK_PUBLIC_KEY", "public-key");
    vi.stubEnv("NODE_ENV", "development");

    expect(getMonobankPaymentProvider()).toBeInstanceOf(
      MonobankPaymentProvider,
    );
  });

  it("requires Monobank credentials without the fallback", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getMonobankPaymentProvider()).toThrow(/MONOBANK_TOKEN/);
  });
});
