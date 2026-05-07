import { POST } from "./route";
import {
  getE2eAuthMemoryDb,
  resetE2eAuthMemoryDb,
} from "@/modules/users/infrastructure/e2e-auth-memory-store";

describe("test reset route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetE2eAuthMemoryDb();
  });

  it("is unavailable outside Playwright e2e mode", async () => {
    const response = await POST();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Недоступно",
    });
  });

  it("clears the e2e auth memory store in Playwright e2e mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    getE2eAuthMemoryDb().users.push({ id: "user-1" });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(getE2eAuthMemoryDb().users).toHaveLength(0);
  });
});
