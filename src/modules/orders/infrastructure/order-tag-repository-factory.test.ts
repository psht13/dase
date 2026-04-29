import { InMemoryOrderTagRepository } from "@/modules/orders/infrastructure/in-memory-order-tag-repository";
import {
  getOrderTagRepository,
  resetOrderTagRepositoryForTests,
} from "@/modules/orders/infrastructure/order-tag-repository-factory";

describe("getOrderTagRepository", () => {
  beforeEach(() => {
    resetOrderTagRepositoryForTests();
    delete process.env.DATABASE_URL;
    delete process.env.PLAYWRIGHT_E2E;
  });

  it("uses the in-memory repository for Playwright fallback", () => {
    process.env.PLAYWRIGHT_E2E = "1";

    expect(getOrderTagRepository()).toBeInstanceOf(InMemoryOrderTagRepository);
  });

  it("requires database configuration outside fallback mode", () => {
    expect(() => getOrderTagRepository()).toThrow(/DATABASE_URL/);
  });
});
