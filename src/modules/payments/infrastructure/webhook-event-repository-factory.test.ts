import { InMemoryWebhookEventRepository } from "@/modules/payments/infrastructure/in-memory-webhook-event-repository";
import {
  getWebhookEventRepository,
  resetWebhookEventRepositoryForTests,
} from "@/modules/payments/infrastructure/webhook-event-repository-factory";
import { resetServerEnvForTests } from "@/shared/config/env";

describe("getWebhookEventRepository", () => {
  afterEach(() => {
    resetWebhookEventRepositoryForTests();
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("uses the Playwright fallback repository outside production", () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(getWebhookEventRepository()).toBeInstanceOf(
      InMemoryWebhookEventRepository,
    );
  });

  it("requires a database URL without the fallback", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() => getWebhookEventRepository()).toThrow(/DATABASE_URL/);
  });
});
