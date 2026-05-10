import type { ApplicationEncryptionService } from "@/modules/shipping/application/application-encryption-service";
import { createApplicationEncryptionServiceFromEnv } from "@/modules/shipping/infrastructure/node-application-encryption-service";

let cachedEncryptionService: ApplicationEncryptionService | undefined;

export function getApplicationEncryptionService(): ApplicationEncryptionService {
  cachedEncryptionService ??= createApplicationEncryptionServiceFromEnv();

  return cachedEncryptionService;
}

export function getLazyApplicationEncryptionService(): ApplicationEncryptionService {
  let resolvedEncryptionService: ApplicationEncryptionService | undefined;

  return {
    decrypt: (ciphertext) => {
      resolvedEncryptionService ??= getApplicationEncryptionService();

      return resolvedEncryptionService.decrypt(ciphertext);
    },
    encrypt: (plaintext) => {
      resolvedEncryptionService ??= getApplicationEncryptionService();

      return resolvedEncryptionService.encrypt(plaintext);
    },
  };
}

export function resetApplicationEncryptionServiceForTests(): void {
  cachedEncryptionService = undefined;
}
