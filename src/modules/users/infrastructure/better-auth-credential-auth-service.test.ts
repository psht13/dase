import { BetterAuthCredentialAuthService } from "@/modules/users/infrastructure/better-auth-credential-auth-service";

describe("BetterAuthCredentialAuthService", () => {
  it("creates a credential user through Better Auth", async () => {
    const signUpEmail = vi.fn(async () => ({
      user: {
        email: "owner@example.com",
        id: "user-1",
        name: "Олена",
      },
    }));
    const service = new BetterAuthCredentialAuthService({
      signUpEmail,
    } as never);

    await expect(
      service.signUpWithEmailPassword({
        email: "owner@example.com",
        name: "Олена",
        password: "secure-password",
      }),
    ).resolves.toEqual({
      email: "owner@example.com",
      id: "user-1",
      name: "Олена",
    });
    expect(signUpEmail).toHaveBeenCalledWith({
      body: {
        email: "owner@example.com",
        name: "Олена",
        password: "secure-password",
        rememberMe: false,
      },
    });
  });
});
