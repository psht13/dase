import type { CredentialAuthService } from "@/modules/users/application/credential-auth-service";
import { BetterAuthCredentialAuthService } from "@/modules/users/infrastructure/better-auth-credential-auth-service";

let cachedService: CredentialAuthService | undefined;

export function getCredentialAuthService(): CredentialAuthService {
  cachedService ??= new BetterAuthCredentialAuthService();

  return cachedService;
}

export function resetCredentialAuthServiceForTests(): void {
  cachedService = undefined;
}
