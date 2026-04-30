import { GET } from "./route";
import { getAuth } from "@/modules/users/infrastructure/auth";

vi.mock("@/modules/users/infrastructure/auth", () => ({
  getAuth: vi.fn(),
}));

describe("logout route", () => {
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
});
