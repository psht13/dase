import { resetServerEnvForTests } from "@/shared/config/env";
import { InMemoryAuditEventRepository } from "@/modules/orders/infrastructure/in-memory-audit-event-repository";
import {
  getAuditEventRepository,
  resetAuditEventRepositoryForTests,
} from "@/modules/orders/infrastructure/audit-event-repository-factory";

describe("getAuditEventRepository", () => {
  afterEach(() => {
    resetAuditEventRepositoryForTests();
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("uses the Playwright fallback repository outside production", () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(getAuditEventRepository()).toBeInstanceOf(
      InMemoryAuditEventRepository,
    );
  });

  it("requires a database URL without the fallback", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getAuditEventRepository()).toThrow(/DATABASE_URL/);
  });
});
