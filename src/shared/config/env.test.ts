import {
  getServerEnv,
  resetServerEnvForTests,
  validateServerEnv,
} from "@/shared/config/env";

describe("validateServerEnv", () => {
  afterEach(() => {
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("defaults development settings without requiring secrets", () => {
    const env = validateServerEnv({
      NODE_ENV: "development",
    });

    expect(env.AUTO_COMPLETE_AFTER_DELIVERED_HOURS).toBe(24);
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("requires database and auth settings in production", () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: "production",
      }),
    ).toThrow(/DATABASE_URL is required in production/);
  });

  it("accepts production settings when required values are present", () => {
    const env = validateServerEnv({
      BETTER_AUTH_SECRET: "a".repeat(32),
      BETTER_AUTH_URL: "https://dase.example.com",
      DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
      NODE_ENV: "production",
    });

    expect(env.BETTER_AUTH_URL).toBe("https://dase.example.com");
    expect(env.DATABASE_URL).toBe(
      "postgres://user:pass@example.com:5432/dase",
    );
  });

  it("caches validated process environment values", () => {
    vi.stubEnv("AUTO_COMPLETE_AFTER_DELIVERED_HOURS", "48");

    const env = getServerEnv();

    expect(env.AUTO_COMPLETE_AFTER_DELIVERED_HOURS).toBe(48);
    expect(getServerEnv().AUTO_COMPLETE_AFTER_DELIVERED_HOURS).toBe(48);
  });
});
