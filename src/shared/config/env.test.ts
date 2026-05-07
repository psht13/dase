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
    expect(env.SHIPPING_LABEL_CREATION_MODE).toBe("mock");
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
    expect(env.SHIPPING_LABEL_CREATION_MODE).toBe("disabled");
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
      NOVA_POST_DEFAULT_HEIGHT_MM: "100",
      NOVA_POST_DEFAULT_LENGTH_MM: "300",
      NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS: "500",
      NOVA_POST_DEFAULT_WIDTH_MM: "200",
      NOVA_POST_PAYER_TYPE: "Recipient",
      NOVA_POST_SENDER_COUNTRY_CODE: "UA",
      NOVA_POST_SENDER_DIVISION_ID: "11759",
      NOVA_POST_SENDER_EMAIL: "",
      NOVA_POST_SENDER_NAME: "Тестова Тетяна",
      NOVA_POST_SENDER_PHONE: "380007654321",
      SHIPPING_LABEL_CREATION_MODE: "live",
    });

    expect(env.NOVA_POST_API_URL).toBe("https://api.novapost.com/v.1.0/");
    expect(env.NOVA_POST_AUTH_URL).toBe(
      "https://api.novapost.com/v.1.0/clients/authorization",
    );
    expect(env.NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS).toBe(750);
    expect(env.NOVA_POST_SENDER_EMAIL).toBeUndefined();
    expect(env.SHIPPING_LABEL_CREATION_MODE).toBe("live");
  });

  it("accepts production disabled mode without Nova Post credentials", () => {
    const env = validateServerEnv({
      BETTER_AUTH_SECRET: "a".repeat(32),
      BETTER_AUTH_URL: "https://dase.example.com",
      DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
      NODE_ENV: "production",
      OWNER_SETUP_TOKEN: "b".repeat(32),
      SHIPPING_LABEL_CREATION_MODE: "disabled",
    });

    expect(env.SHIPPING_LABEL_CREATION_MODE).toBe("disabled");
    expect(env.NOVA_POST_API_KEY).toBeUndefined();
  });

  it("rejects mock label creation mode in production", () => {
    expect(() =>
      validateServerEnv({
        BETTER_AUTH_SECRET: "a".repeat(32),
        BETTER_AUTH_URL: "https://dase.example.com",
        DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
        NODE_ENV: "production",
        OWNER_SETUP_TOKEN: "b".repeat(32),
        SHIPPING_LABEL_CREATION_MODE: "mock",
      }),
    ).toThrow(/SHIPPING_LABEL_CREATION_MODE=mock is not allowed/);
  });

  it("requires complete Nova Post settings in live label creation mode", () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: "development",
        NOVA_POST_API_KEY: "nova-key",
        SHIPPING_LABEL_CREATION_MODE: "live",
      }),
    ).toThrow(/NOVA_POST_SENDER_DIVISION_ID is required/);

    expect(() =>
      validateServerEnv({
        NODE_ENV: "development",
        NOVA_POST_API_KEY: "nova-key",
        NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS: "500",
        NOVA_POST_DEFAULT_HEIGHT_MM: "100",
        NOVA_POST_DEFAULT_LENGTH_MM: "300",
        NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS: "500",
        NOVA_POST_DEFAULT_WIDTH_MM: "200",
        NOVA_POST_PAYER_TYPE: "ThirdPerson",
        NOVA_POST_SENDER_COUNTRY_CODE: "UA",
        NOVA_POST_SENDER_DIVISION_ID: "11759",
        NOVA_POST_SENDER_NAME: "Тестова Тетяна",
        NOVA_POST_SENDER_PHONE: "380007654321",
        SHIPPING_LABEL_CREATION_MODE: "live",
      }),
    ).toThrow(/NOVA_POST_PAYER_CONTRACT_NUMBER is required/);
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
