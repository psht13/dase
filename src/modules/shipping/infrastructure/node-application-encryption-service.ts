import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { ApplicationEncryptionService } from "@/modules/shipping/application/application-encryption-service";

const algorithm = "aes-256-gcm";
const encryptionVersion = "v1";
const keyLengthBytes = 32;
const nonceLengthBytes = 12;

export class ApplicationEncryptionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationEncryptionConfigurationError";
  }
}

export class NodeApplicationEncryptionService
  implements ApplicationEncryptionService
{
  private readonly key: Buffer;

  constructor(key: Buffer) {
    if (key.length !== keyLengthBytes) {
      throw new ApplicationEncryptionConfigurationError(
        "APP_ENCRYPTION_KEY must decode to an AES-256 key",
      );
    }

    this.key = Buffer.from(key);
  }

  async encrypt(plaintext: string): Promise<string> {
    const nonce = randomBytes(nonceLengthBytes);
    const cipher = createCipheriv(algorithm, this.key, nonce);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      encryptionVersion,
      nonce.toString("base64"),
      authTag.toString("base64"),
      ciphertext.toString("base64"),
    ].join(":");
  }

  async decrypt(ciphertext: string): Promise<string> {
    const [version, nonce, authTag, encryptedPayload] = ciphertext.split(":");

    if (
      version !== encryptionVersion ||
      !nonce ||
      !authTag ||
      !encryptedPayload
    ) {
      throw new Error("Unsupported encrypted payload format");
    }

    const decipher = createDecipheriv(
      algorithm,
      this.key,
      Buffer.from(nonce, "base64"),
    );

    decipher.setAuthTag(Buffer.from(authTag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPayload, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}

export function createApplicationEncryptionServiceFromEnv(
  env: {
    APP_ENCRYPTION_KEY?: string;
    BETTER_AUTH_SECRET?: string;
    NODE_ENV?: string;
  } = process.env,
): NodeApplicationEncryptionService {
  return new NodeApplicationEncryptionService(
    decodeApplicationEncryptionKey(env.APP_ENCRYPTION_KEY, {
      betterAuthSecret: env.BETTER_AUTH_SECRET,
      nodeEnv: env.NODE_ENV,
    }),
  );
}

export function decodeApplicationEncryptionKey(
  value: string | undefined,
  options: {
    betterAuthSecret?: string;
    nodeEnv?: string;
  } = {},
): Buffer {
  const rawKey = value?.trim();

  if (!rawKey) {
    throw new ApplicationEncryptionConfigurationError(
      "APP_ENCRYPTION_KEY is required to encrypt owner Nova Post settings",
    );
  }

  if (options.betterAuthSecret && rawKey === options.betterAuthSecret.trim()) {
    throw new ApplicationEncryptionConfigurationError(
      "APP_ENCRYPTION_KEY must not reuse BETTER_AUTH_SECRET",
    );
  }

  const keyMaterial = decodeKeyMaterial(rawKey);

  if (keyMaterial.length < keyLengthBytes) {
    throw new ApplicationEncryptionConfigurationError(
      "APP_ENCRYPTION_KEY must be at least 32 bytes encoded as base64 or hex",
    );
  }

  if (keyMaterial.length === keyLengthBytes) {
    return keyMaterial;
  }

  return createHash("sha256").update(keyMaterial).digest();
}

function decodeKeyMaterial(value: string): Buffer {
  if (/^[0-9a-f]+$/i.test(value) && value.length % 2 === 0) {
    return Buffer.from(value, "hex");
  }

  if (/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    const decoded = Buffer.from(value, "base64");

    if (decoded.toString("base64").replace(/=+$/, "") === value.replace(/=+$/, "")) {
      return decoded;
    }
  }

  throw new ApplicationEncryptionConfigurationError(
    "APP_ENCRYPTION_KEY must be base64 or hex encoded",
  );
}
