import { GET } from "./route";
import { getAuth } from "@/modules/users/infrastructure/auth";
import { resetServerEnvForTests } from "@/shared/config/env";

vi.mock("@/modules/users/infrastructure/auth", () => ({
  getAuth: vi.fn(),
}));

describe("logout route", () => {
  afterEach(() => {
    resetServerEnvForTests();
    vi.unstubAllEnvs();
  });

  it("signs out through Better Auth and redirects to login", async () => {
    const signOut = vi.fn(async () => {
      const headers = new Headers();
      headers.append("set-cookie", "better-auth.session_token=; Path=/");

      return new Response(null, { headers });
    });
    vi.mocked(getAuth).mockReturnValue({
      api: {
        signOut,
      },
    } as never);

    const response = await GET(new Request("https://dase.example.com/logout"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://dase.example.com/login?logout=1",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "better-auth.session_token=",
    );
    expect(signOut).toHaveBeenCalledWith({
      asResponse: true,
      headers: expect.anything(),
    });
  });

  it("uses the configured public web URL when Railway exposes an internal request URL", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(32));
    vi.stubEnv("BETTER_AUTH_URL", "https://web-production-26609.up.railway.app");
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@example.com:5432/dase");
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(getAuth).mockReturnValue({
      api: {
        signOut: vi.fn(async () => new Response(null)),
      },
    } as never);

    const response = await GET(
      new Request("https://localhost:8080/logout", {
        headers: {
          "x-forwarded-host": "web-production-26609.up.railway.app",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://web-production-26609.up.railway.app/login?logout=1",
    );
  });

  it("refuses a localhost production auth URL before redirecting", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(32));
    vi.stubEnv("BETTER_AUTH_URL", "https://localhost:8080");
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@example.com:5432/dase");
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(getAuth).mockReturnValue({
      api: {
        signOut: vi.fn(async () => new Response(null)),
      },
    } as never);

    await expect(
      GET(
        new Request("https://localhost:8080/logout", {
          headers: {
            "x-forwarded-host": "web-production-26609.up.railway.app",
            "x-forwarded-proto": "https",
          },
        }),
      ),
    ).rejects.toThrow(/BETTER_AUTH_URL must be a public HTTPS origin/);

    await expect(
      GET(
        new Request("https://localhost:8080/logout", {
          headers: {
            "x-forwarded-host": "web-production-26609.up.railway.app",
            "x-forwarded-proto": "https",
          },
        }),
      ),
    ).rejects.not.toThrow(/localhost:8080/);
  });
});
