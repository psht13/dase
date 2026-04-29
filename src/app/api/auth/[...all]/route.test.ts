import { GET, POST } from "./route";
import { getAuth } from "@/modules/users/infrastructure/auth";

vi.mock("@/modules/users/infrastructure/auth", () => ({
  getAuth: vi.fn(),
}));

describe("Better Auth route", () => {
  it("delegates GET and POST requests to Better Auth", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    vi.mocked(getAuth).mockReturnValue({ handler } as never);
    const request = new Request("http://localhost/api/auth/get-session");

    await expect(GET(request)).resolves.toBeInstanceOf(Response);
    await expect(POST(request)).resolves.toBeInstanceOf(Response);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
