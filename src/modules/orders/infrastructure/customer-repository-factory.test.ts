import { resetServerEnvForTests } from "@/shared/config/env";
import { InMemoryCustomerRepository } from "@/modules/orders/infrastructure/in-memory-customer-repository";
import {
  getCustomerRepository,
  resetCustomerRepositoryForTests,
} from "@/modules/orders/infrastructure/customer-repository-factory";

describe("getCustomerRepository", () => {
  afterEach(() => {
    resetCustomerRepositoryForTests();
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("uses the Playwright fallback repository outside production", () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(getCustomerRepository()).toBeInstanceOf(InMemoryCustomerRepository);
  });

  it("requires a database URL without the fallback", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getCustomerRepository()).toThrow(/DATABASE_URL/);
  });
});
