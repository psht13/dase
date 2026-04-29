import { appRoles, defaultUserRole, isAppRole, parseAppRole } from "./roles";

describe("app roles", () => {
  it("allows only owner and user roles", () => {
    expect(appRoles).toEqual(["owner", "user"]);
    expect(defaultUserRole).toBe("user");
  });

  it("validates supported roles", () => {
    expect(isAppRole("owner")).toBe(true);
    expect(isAppRole("user")).toBe(true);
    expect(parseAppRole("owner")).toBe("owner");
  });

  it("rejects unsupported roles", () => {
    expect(isAppRole("legacy")).toBe(false);
    expect(() => parseAppRole("legacy")).toThrow(/Unsupported user role/);
  });
});
