import { getAuth } from "@/modules/users/infrastructure/auth";
import { getSessionUserFromHeaders } from "./auth-session";

vi.mock("@/modules/users/infrastructure/auth", () => ({
  getAuth: vi.fn(),
}));

describe("getSessionUserFromHeaders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(getAuth).mockReset();
  });

  it("reads the Playwright seeded owner session outside production", async () => {
    vi.stubEnv("PLAYWRIGHT_E2E", "1");
    vi.stubEnv("NODE_ENV", "development");

    await expect(
      getSessionUserFromHeaders(
        new Headers({
          cookie:
            "dase_e2e_role=owner; dase_e2e_user_id=owner-1; dase_e2e_email=owner%40example.com",
        }),
      ),
    ).resolves.toEqual({
      email: "owner@example.com",
      id: "owner-1",
      name: "Тестовий власник",
      role: "owner",
    });
  });

  it("uses Better Auth session data when e2e auth is disabled", async () => {
    vi.mocked(getAuth).mockReturnValue({
      api: {
        getSession: vi.fn(async () => ({
          user: {
            email: "owner@example.com",
            id: "owner-1",
            name: "Власниця",
            role: "owner",
          },
        })),
      },
    } as never);

    await expect(getSessionUserFromHeaders(new Headers())).resolves.toEqual({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
  });

  it("rejects unsupported roles from Better Auth session data", async () => {
    vi.mocked(getAuth).mockReturnValue({
      api: {
        getSession: vi.fn(async () => ({
          user: {
            email: "legacy@example.com",
            id: "user-1",
            name: "Користувач",
            role: "legacy",
          },
        })),
      },
    } as never);

    await expect(getSessionUserFromHeaders(new Headers())).resolves.toBeNull();
  });
});
