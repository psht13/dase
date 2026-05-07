import {
  getServerEnv,
  getWebEnv,
  getWorkerEnv,
  resetServerEnvForTests,
  validateServerEnv,
  validateTestEnv,
  validateWebEnv,
  validateWorkerEnv,
} from "@/shared/config/env";

describe("runtime environment validation", () => {
  afterEach(() => {
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("defaults development and test settings without requiring secrets", () => {
    const devEnv = validateServerEnv({
      NODE_ENV: "development",
    });
    const testEnv = validateTestEnv({});

    expect(devEnv.AUTO_COMPLETE_AFTER_DELIVERED_HOURS).toBe(24);
    expect(devEnv.DATABASE_URL).toBeUndefined();
    expect(devEnv.SHIPPING_LABEL_CREATION_MODE).toBe("mock");
    expect(testEnv.NODE_ENV).toBe("test");
    expect(testEnv.SHIPPING_LABEL_CREATION_MODE).toBe("mock");
  });

  it("keeps getServerEnv safe for shared infrastructure parsing", () => {
    const env = validateServerEnv({
      NODE_ENV: "production",
      SHIPPING_LABEL_CREATION_MODE: "disabled",
    });

    expect(env.NODE_ENV).toBe("production");
    expect(env.BETTER_AUTH_SECRET).toBeUndefined();
    expect(env.OWNER_SETUP_TOKEN).toBeUndefined();
    expect(env.SHIPPING_LABEL_CREATION_MODE).toBe("disabled");
  });

  it("requires only web-owned production settings for the web runtime", () => {
    expect(() =>
      validateWebEnv({
        NODE_ENV: "production",
      }),
    ).toThrow(/DATABASE_URL is required for web production/);

    const env = validateWebEnv({
      BETTER_AUTH_SECRET: "a".repeat(32),
      BETTER_AUTH_URL: "https://dase.example.com",
      DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
      NODE_ENV: "production",
    });

    expect(env.BETTER_AUTH_URL).toBe("https://dase.example.com");
    expect(env.DATABASE_URL).toBe(
      "postgres://user:pass@example.com:5432/dase",
    );
    expect(env.OWNER_SETUP_TOKEN).toBeUndefined();
    expect(env.SHIPPING_LABEL_CREATION_MODE).toBe("disabled");
  });

  it("allows localhost Better Auth URLs outside production", () => {
    const env = validateWebEnv({
      BETTER_AUTH_URL: "http://localhost:3000",
      NODE_ENV: "development",
    });

    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("rejects private Better Auth URLs in production without exposing values", () => {
    const baseProductionWebEnv = {
      BETTER_AUTH_SECRET: "a".repeat(32),
      DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
      NODE_ENV: "production",
    };

    for (const BETTER_AUTH_URL of [
      "http://localhost:3000",
      "https://127.0.0.1:8080",
      "https://0.0.0.0:3000",
      "https://[::1]:3000",
      "https://web.railway.internal",
      "http://dase.example.com",
      "https://dase.example.com/auth",
    ]) {
      expect(() =>
        validateWebEnv({
          ...baseProductionWebEnv,
          BETTER_AUTH_URL,
        }),
      ).toThrow(/BETTER_AUTH_URL must be a public HTTPS origin/);

      expect(() =>
        validateWebEnv({
          ...baseProductionWebEnv,
          BETTER_AUTH_URL,
        }),
      ).not.toThrow(BETTER_AUTH_URL);
    }
  });

  it("requires the setup token only for enabled production first-owner setup", () => {
    const baseProductionWebEnv = {
      BETTER_AUTH_SECRET: "a".repeat(32),
      BETTER_AUTH_URL: "https://dase.example.com",
      DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
      NODE_ENV: "production",
    };

    expect(() =>
      validateWebEnv(baseProductionWebEnv, {
        requireOwnerSetupToken: true,
      }),
    ).toThrow(
      /OWNER_SETUP_TOKEN is required when first-owner setup is enabled in production/,
    );

    expect(
      validateWebEnv(
        {
          ...baseProductionWebEnv,
          OWNER_SETUP_TOKEN: "b".repeat(32),
        },
        { requireOwnerSetupToken: true },
      ).OWNER_SETUP_TOKEN,
    ).toBe("b".repeat(32));
  });

  it("requires worker-owned production settings without login or setup secrets", () => {
    expect(() =>
      validateWorkerEnv({
        NODE_ENV: "production",
      }),
    ).toThrow(/DATABASE_URL is required for worker production/);

    expect(() =>
      validateWorkerEnv({
        DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
        NODE_ENV: "production",
      }),
    ).toThrow(
      /AUTO_COMPLETE_AFTER_DELIVERED_HOURS is required for worker production/,
    );

    const env = validateWorkerEnv({
      AUTO_COMPLETE_AFTER_DELIVERED_HOURS: "24",
      DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
      NODE_ENV: "production",
      SHIPPING_LABEL_CREATION_MODE: "disabled",
    });

    expect(env.AUTO_COMPLETE_AFTER_DELIVERED_HOURS).toBe(24);
    expect(env.BETTER_AUTH_SECRET).toBeUndefined();
    expect(env.BETTER_AUTH_URL).toBeUndefined();
    expect(env.OWNER_SETUP_TOKEN).toBeUndefined();
  });

  it("accepts production disabled shipping mode without Nova Post credentials", () => {
    const env = validateWorkerEnv({
      AUTO_COMPLETE_AFTER_DELIVERED_HOURS: "24",
      DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
      NODE_ENV: "production",
      SHIPPING_LABEL_CREATION_MODE: "disabled",
    });

    expect(env.SHIPPING_LABEL_CREATION_MODE).toBe("disabled");
    expect(env.NOVA_POST_API_KEY).toBeUndefined();
  });

  it("rejects mock shipping mode in production", () => {
    expect(() =>
      validateWebEnv({
        BETTER_AUTH_SECRET: "a".repeat(32),
        BETTER_AUTH_URL: "https://dase.example.com",
        DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
        NODE_ENV: "production",
        SHIPPING_LABEL_CREATION_MODE: "mock",
      }),
    ).toThrow(/SHIPPING_LABEL_CREATION_MODE=mock is not allowed/);
  });

  it("parses Nova Post v1 configuration for live shipping mode", () => {
    const env = validateWorkerEnv({
      AUTO_COMPLETE_AFTER_DELIVERED_HOURS: "24",
      DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
      NODE_ENV: "production",
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

  it("requires complete Nova Post settings in live shipping mode", () => {
    expect(() =>
      validateWorkerEnv({
        AUTO_COMPLETE_AFTER_DELIVERED_HOURS: "24",
        DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
        NODE_ENV: "production",
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

  it("keeps missing-env errors explicit without secret values", () => {
    expect(() =>
      validateWebEnv(
        {
          BETTER_AUTH_SECRET: "a".repeat(32),
          BETTER_AUTH_URL: "https://dase.example.com",
          DATABASE_URL: "postgres://user:secret@example.com:5432/dase",
          NODE_ENV: "production",
        },
        { requireOwnerSetupToken: true },
      ),
    ).toThrow(/OWNER_SETUP_TOKEN/);

    expect(() =>
      validateWebEnv(
        {
          BETTER_AUTH_SECRET: "a".repeat(32),
          BETTER_AUTH_URL: "https://dase.example.com",
          DATABASE_URL: "postgres://user:secret@example.com:5432/dase",
          NODE_ENV: "production",
        },
        { requireOwnerSetupToken: true },
      ),
    ).not.toThrow(/secret@example/);
  });

  it("caches runtime-specific process environment values", () => {
    vi.stubEnv("AUTO_COMPLETE_AFTER_DELIVERED_HOURS", "48");
    vi.stubEnv("NODE_ENV", "development");

    const serverEnv = getServerEnv();
    const webEnv = getWebEnv();
    const workerEnv = getWorkerEnv();

    expect(serverEnv.AUTO_COMPLETE_AFTER_DELIVERED_HOURS).toBe(48);
    expect(webEnv.AUTO_COMPLETE_AFTER_DELIVERED_HOURS).toBe(48);
    expect(workerEnv.AUTO_COMPLETE_AFTER_DELIVERED_HOURS).toBe(48);
    expect(getWorkerEnv().AUTO_COMPLETE_AFTER_DELIVERED_HOURS).toBe(48);
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
