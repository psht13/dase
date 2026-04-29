import { resetServerEnvForTests } from "@/shared/config/env";
import { InMemoryCarrierDirectoryCacheRepository } from "@/modules/shipping/infrastructure/in-memory-carrier-directory-cache-repository";
import {
  getCarrierDirectoryCacheRepository,
  resetCarrierDirectoryCacheRepositoryForTests,
} from "@/modules/shipping/infrastructure/carrier-directory-cache-repository-factory";

describe("getCarrierDirectoryCacheRepository", () => {
  afterEach(() => {
    resetCarrierDirectoryCacheRepositoryForTests();
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("uses the Playwright fallback repository outside production", () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(getCarrierDirectoryCacheRepository()).toBeInstanceOf(
      InMemoryCarrierDirectoryCacheRepository,
    );
  });

  it("requires a database URL without the fallback", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getCarrierDirectoryCacheRepository()).toThrow(/DATABASE_URL/);
  });
});
