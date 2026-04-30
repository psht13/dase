import type {
  CredentialAuthService,
  CredentialAuthUser,
  SignUpWithEmailPasswordInput,
} from "@/modules/users/application/credential-auth-service";
import { getAuth } from "@/modules/users/infrastructure/auth";

type AuthApi = ReturnType<typeof getAuth>["api"];

export class BetterAuthCredentialAuthService implements CredentialAuthService {
  constructor(private readonly authApi: AuthApi = getAuth().api) {}

  async signUpWithEmailPassword(
    input: SignUpWithEmailPasswordInput,
  ): Promise<CredentialAuthUser> {
    const result = await this.authApi.signUpEmail({
      body: {
        email: input.email,
        name: input.name,
        password: input.password,
        rememberMe: false,
      },
    });

    return {
      email: result.user.email,
      id: result.user.id,
      name: result.user.name ?? null,
    };
  }
}
