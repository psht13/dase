import { resetServerEnvForTests } from "@/shared/config/env";
import { InMemoryPaymentRepository } from "@/modules/payments/infrastructure/in-memory-payment-repository";
import {
  getPaymentRepository,
  resetPaymentRepositoryForTests,
} from "@/modules/payments/infrastructure/payment-repository-factory";

describe("getPaymentRepository", () => {
  afterEach(() => {
    resetPaymentRepositoryForTests();
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("uses the Playwright fallback repository outside production", () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(getPaymentRepository()).toBeInstanceOf(InMemoryPaymentRepository);
  });

  it("requires a database URL without the fallback", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getPaymentRepository()).toThrow(/DATABASE_URL/);
  });
});
