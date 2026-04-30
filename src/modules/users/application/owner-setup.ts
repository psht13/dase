import type { CredentialAuthService } from "@/modules/users/application/credential-auth-service";
import type { OwnerSetupLock } from "@/modules/users/application/owner-setup-lock";
import type { UserRecord, UserRepository } from "@/modules/users/application/user-repository";

export type OwnerSetupTokenInput = {
  expectedToken?: string;
  nodeEnv: "development" | "test" | "production";
  submittedToken?: string | null;
};

export type CreateFirstOwnerInput = {
  email: string;
  name: string;
  password: string;
};

type CreateFirstOwnerDependencies = {
  credentialAuthService: CredentialAuthService;
  ownerSetupLock?: OwnerSetupLock;
  userRepository: UserRepository;
};

export class FirstOwnerSetupUnavailableError extends Error {
  constructor() {
    super("First owner setup is unavailable");
    this.name = "FirstOwnerSetupUnavailableError";
  }
}

export function isOwnerSetupTokenValid(input: OwnerSetupTokenInput): boolean {
  if (input.nodeEnv !== "production") {
    return true;
  }

  return Boolean(
    input.expectedToken &&
      input.submittedToken &&
      input.expectedToken === input.submittedToken,
  );
}

export async function getOwnerSetupStateUseCase(dependencies: {
  userRepository: UserRepository;
}): Promise<{ available: boolean }> {
  const ownerCount = await dependencies.userRepository.countByRole("owner");

  return {
    available: ownerCount === 0,
  };
}

export async function createFirstOwnerUseCase(
  input: CreateFirstOwnerInput,
  dependencies: CreateFirstOwnerDependencies,
): Promise<UserRecord> {
  const createOwner = async () => {
    const state = await getOwnerSetupStateUseCase({
      userRepository: dependencies.userRepository,
    });

    if (!state.available) {
      throw new FirstOwnerSetupUnavailableError();
    }

    const user = await dependencies.credentialAuthService.signUpWithEmailPassword({
      email: input.email,
      name: input.name,
      password: input.password,
    });

    return dependencies.userRepository.updateRole(user.id, "owner");
  };

  if (dependencies.ownerSetupLock) {
    return dependencies.ownerSetupLock.runExclusive(createOwner);
  }

  return createOwner();
}
