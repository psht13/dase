import { resetServerEnvForTests } from "@/shared/config/env";
import { InMemoryOrderRepository } from "@/modules/orders/infrastructure/in-memory-order-repository";
import {
  getOrderRepository,
  resetOrderRepositoryForTests,
} from "@/modules/orders/infrastructure/order-repository-factory";

describe("getOrderRepository", () => {
  afterEach(() => {
    resetOrderRepositoryForTests();
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("uses the Playwright fallback repository outside production", () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(getOrderRepository()).toBeInstanceOf(InMemoryOrderRepository);
  });

  it("requires a database URL without the fallback", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getOrderRepository()).toThrow(/DATABASE_URL/);
  });
});
