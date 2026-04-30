import {
  createFirstOwnerUseCase,
  FirstOwnerSetupUnavailableError,
  getOwnerSetupStateUseCase,
  isOwnerSetupTokenValid,
} from "@/modules/users/application/owner-setup";
import type { CredentialAuthService } from "@/modules/users/application/credential-auth-service";
import type { OwnerSetupLock } from "@/modules/users/application/owner-setup-lock";
import type {
  UserRecord,
  UserRepository,
} from "@/modules/users/application/user-repository";

const now = new Date("2026-04-30T10:00:00.000Z");

describe("owner setup use cases", () => {
  it("allows setup when no owner exists", async () => {
    const userRepository = createUserRepository({ ownerCount: 0 });

    await expect(
      getOwnerSetupStateUseCase({ userRepository }),
    ).resolves.toEqual({
      available: true,
    });
  });

  it("creates the first owner through credential auth and promotes the role", async () => {
    const userRepository = createUserRepository({ ownerCount: 0 });
    const credentialAuthService = createCredentialAuthService();
    const ownerSetupLock = createOwnerSetupLock();

    await expect(
      createFirstOwnerUseCase(
        {
          email: "owner@example.com",
          name: "Олена",
          password: "secure-password",
        },
        {
          credentialAuthService,
          ownerSetupLock,
          userRepository,
        },
      ),
    ).resolves.toMatchObject({
      email: "owner@example.com",
      role: "owner",
    });
    expect(ownerSetupLock.runExclusive).toHaveBeenCalledTimes(1);
    expect(credentialAuthService.signUpWithEmailPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      name: "Олена",
      password: "secure-password",
    });
    expect(userRepository.updateRole).toHaveBeenCalledWith("user-1", "owner");
  });

  it("blocks setup after an owner exists", async () => {
    await expect(
      createFirstOwnerUseCase(
        {
          email: "owner@example.com",
          name: "Олена",
          password: "secure-password",
        },
        {
          credentialAuthService: createCredentialAuthService(),
          userRepository: createUserRepository({ ownerCount: 1 }),
        },
      ),
    ).rejects.toBeInstanceOf(FirstOwnerSetupUnavailableError);
  });

  it("requires a matching setup token in production only", () => {
    expect(
      isOwnerSetupTokenValid({
        expectedToken: "a".repeat(32),
        nodeEnv: "production",
        submittedToken: "wrong-token",
      }),
    ).toBe(false);
    expect(
      isOwnerSetupTokenValid({
        expectedToken: "a".repeat(32),
        nodeEnv: "production",
        submittedToken: "a".repeat(32),
      }),
    ).toBe(true);
    expect(
      isOwnerSetupTokenValid({
        nodeEnv: "development",
        submittedToken: null,
      }),
    ).toBe(true);
  });
});

function createCredentialAuthService(): CredentialAuthService {
  return {
    signUpWithEmailPassword: vi.fn(async (input) => ({
      email: input.email,
      id: "user-1",
      name: input.name,
    })),
  };
}

function createOwnerSetupLock(): OwnerSetupLock {
  return {
    runExclusive: vi.fn(async (work) => work()),
  };
}

function createUserRepository(input: { ownerCount: number }): UserRepository {
  const user = createUser("user");

  return {
    countByRole: vi.fn(async () => input.ownerCount),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    updateRole: vi.fn(async (_userId, role) => ({
      ...user,
      role,
    })),
  };
}

function createUser(role: UserRecord["role"]): UserRecord {
  return {
    createdAt: now,
    email: "owner@example.com",
    emailVerified: false,
    id: "user-1",
    image: null,
    name: "Олена",
    role,
    updatedAt: now,
  };
}
