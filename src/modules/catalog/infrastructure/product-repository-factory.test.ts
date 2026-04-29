import {
  getProductRepository,
  resetProductRepositoryForTests,
} from "./product-repository-factory";
import { InMemoryProductRepository } from "@/modules/catalog/infrastructure/in-memory-product-repository";
import { resetServerEnvForTests } from "@/shared/config/env";

describe("getProductRepository", () => {
  afterEach(() => {
    resetProductRepositoryForTests();
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("uses the Playwright fallback repository only outside production", () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(getProductRepository()).toBeInstanceOf(InMemoryProductRepository);
  });

  it("requires a database URL when no test fallback is enabled", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getProductRepository()).toThrow(/DATABASE_URL/);
  });
});
