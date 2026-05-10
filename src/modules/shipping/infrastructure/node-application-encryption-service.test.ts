import {
  createApplicationEncryptionServiceFromEnv,
  decodeApplicationEncryptionKey,
} from "@/modules/shipping/infrastructure/node-application-encryption-service";

const base64Key = Buffer.from("a".repeat(32)).toString("base64");
const hexKey = Buffer.from("b".repeat(32)).toString("hex");

describe("NodeApplicationEncryptionService", () => {
  it("encrypts and decrypts values with AES-256-GCM", async () => {
    const encryptionService = createApplicationEncryptionServiceFromEnv({
      APP_ENCRYPTION_KEY: base64Key,
      NODE_ENV: "production",
    });

    const encrypted = await encryptionService.encrypt("nova-post-secret");

    expect(encrypted).toMatch(/^v1:/);
    expect(encrypted).not.toContain("nova-post-secret");
    await expect(encryptionService.decrypt(encrypted)).resolves.toBe(
      "nova-post-secret",
    );
  });

  it("accepts base64 or hex keys with at least 32 decoded bytes", () => {
    expect(decodeApplicationEncryptionKey(base64Key)).toHaveLength(32);
    expect(decodeApplicationEncryptionKey(hexKey)).toHaveLength(32);
  });

  it("rejects missing, invalid, short, or reused keys", () => {
    expect(() => decodeApplicationEncryptionKey(undefined)).toThrow(
      /APP_ENCRYPTION_KEY/,
    );
    expect(() => decodeApplicationEncryptionKey("not-valid-key")).toThrow(
      /base64 or hex/,
    );
    expect(() =>
      decodeApplicationEncryptionKey(Buffer.from("short").toString("base64")),
    ).toThrow(/at least 32 bytes/);
    expect(() =>
      decodeApplicationEncryptionKey(base64Key, {
        betterAuthSecret: base64Key,
      }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });
});
