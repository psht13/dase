export type CredentialAuthUser = {
  email: string;
  id: string;
  name: string | null;
};

export type SignUpWithEmailPasswordInput = {
  email: string;
  name: string;
  password: string;
};

export interface CredentialAuthService {
  signUpWithEmailPassword(
    input: SignUpWithEmailPasswordInput,
  ): Promise<CredentialAuthUser>;
}
