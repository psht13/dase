import { authorizeOwnerDashboardAccess } from "./authorize-owner-dashboard";

describe("authorizeOwnerDashboardAccess", () => {
  it("allows owner users to access the dashboard", () => {
    expect(
      authorizeOwnerDashboardAccess({
        email: "owner@example.com",
        id: "owner-1",
        name: "Власниця",
        role: "owner",
      }),
    ).toEqual({
      allowed: true,
      user: {
        email: "owner@example.com",
        id: "owner-1",
        name: "Власниця",
        role: "owner",
      },
    });
  });

  it("rejects unauthenticated access", () => {
    expect(authorizeOwnerDashboardAccess(null)).toEqual({
      allowed: false,
      reason: "unauthenticated",
    });
  });

  it("rejects user role dashboard access", () => {
    expect(
      authorizeOwnerDashboardAccess({
        email: "customer@example.com",
        id: "user-1",
        name: "Покупець",
        role: "user",
      }),
    ).toEqual({
      allowed: false,
      reason: "forbidden",
    });
  });
});
