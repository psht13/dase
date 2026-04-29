import { appRoles, defaultUserRole } from "./roles";

describe("app roles", () => {
  it("allows only owner and user roles", () => {
    expect(appRoles).toEqual(["owner", "user"]);
    expect(defaultUserRole).toBe("user");
  });
});
