import { resetServerEnvForTests } from "@/shared/config/env";
import { InMemoryShipmentRepository } from "@/modules/shipping/infrastructure/in-memory-shipment-repository";
import {
  getShipmentRepository,
  resetShipmentRepositoryForTests,
} from "@/modules/shipping/infrastructure/shipment-repository-factory";

describe("getShipmentRepository", () => {
  afterEach(() => {
    resetShipmentRepositoryForTests();
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("uses the Playwright fallback repository outside production", () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(getShipmentRepository()).toBeInstanceOf(InMemoryShipmentRepository);
  });

  it("requires a database URL without the fallback", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getShipmentRepository()).toThrow(/DATABASE_URL/);
  });
});
