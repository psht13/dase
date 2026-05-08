import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const isProductionSmoke = process.env.RUN_PROD_SMOKE === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: isProductionSmoke
    ? "**/production-auth-smoke.spec.ts"
    : "**/*.spec.ts",
  // Local fallback repositories are process-global in the dev server.
  // Keep browser flows single-worker so seeded E2E data stays deterministic.
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  workers: isProductionSmoke ? undefined : 1,
  webServer: isProductionSmoke
    ? undefined
    : {
        command: `PLAYWRIGHT_E2E=1 SHIPPING_LABEL_CREATION_MODE=disabled BETTER_AUTH_URL=${baseURL} pnpm dev`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
