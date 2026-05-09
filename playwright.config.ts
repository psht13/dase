import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const isProductionSmoke = process.env.RUN_PROD_SMOKE === "1";
const parsedBaseURL = new URL(baseURL);
const devServerHost =
  parsedBaseURL.hostname === "localhost" ? "127.0.0.1" : parsedBaseURL.hostname;
const devServerPort =
  parsedBaseURL.port || (parsedBaseURL.protocol === "https:" ? "443" : "80");
const webServerCommand = [
  "PLAYWRIGHT_E2E=1",
  "DATABASE_URL=",
  "DATABASE_URL_TEST=",
  "SHIPPING_LABEL_CREATION_MODE=disabled",
  `BETTER_AUTH_URL=${baseURL}`,
  "pnpm dev",
  `--hostname ${devServerHost}`,
  `--port ${devServerPort}`,
].join(" ");

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
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
