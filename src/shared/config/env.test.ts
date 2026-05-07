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

    expect(() =>
      validateServerEnv({
        BETTER_AUTH_SECRET: "a".repeat(32),
        BETTER_AUTH_URL: "https://dase.example.com",
        DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
        NODE_ENV: "production",
      }),
    ).toThrow(/OWNER_SETUP_TOKEN is required in production/);
  });

  it("accepts production settings when required values are present", () => {
    const env = validateServerEnv({
      BETTER_AUTH_SECRET: "a".repeat(32),
      BETTER_AUTH_URL: "https://dase.example.com",
      DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
      NODE_ENV: "production",
      OWNER_SETUP_TOKEN: "b".repeat(32),
    });

    expect(env.BETTER_AUTH_URL).toBe("https://dase.example.com");
    expect(env.DATABASE_URL).toBe(
      "postgres://user:pass@example.com:5432/dase",
    );
    expect(env.OWNER_SETUP_TOKEN).toBe("b".repeat(32));
  });

  it("caches validated process environment values", () => {
    vi.stubEnv("AUTO_COMPLETE_AFTER_DELIVERED_HOURS", "48");

    const env = getServerEnv();

    expect(env.AUTO_COMPLETE_AFTER_DELIVERED_HOURS).toBe(48);
    expect(getServerEnv().AUTO_COMPLETE_AFTER_DELIVERED_HOURS).toBe(48);
  });

  it("parses Nova Post v1 configuration", () => {
    const env = validateServerEnv({
      NODE_ENV: "development",
      NOVA_POST_API_KEY: "nova-key",
      NOVA_POST_API_URL: "https://api.novapost.com/v.1.0/",
      NOVA_POST_AUTH_URL:
        "https://api.novapost.com/v.1.0/clients/authorization",
      NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS: "750",
      NOVA_POST_SENDER_COUNTRY_CODE: "UA",
      NOVA_POST_SENDER_DIVISION_ID: "11759",
      NOVA_POST_SENDER_EMAIL: "",
      NOVA_POST_SENDER_NAME: "Тестова Тетяна",
      NOVA_POST_SENDER_PHONE: "380007654321",
    });

    expect(env.NOVA_POST_API_URL).toBe("https://api.novapost.com/v.1.0/");
    expect(env.NOVA_POST_AUTH_URL).toBe(
      "https://api.novapost.com/v.1.0/clients/authorization",
    );
    expect(env.NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS).toBe(750);
    expect(env.NOVA_POST_SENDER_EMAIL).toBeUndefined();
  });

  it("does not expose unknown carrier production variables", () => {
    const env = validateServerEnv({
      LEGACY_CARRIER_API_URL: "https://carrier.test",
      LEGACY_CARRIER_TOKEN: "secret",
      NODE_ENV: "development",
    });

    expect("LEGACY_CARRIER_API_URL" in env).toBe(false);
    expect("LEGACY_CARRIER_TOKEN" in env).toBe(false);
  });
});
