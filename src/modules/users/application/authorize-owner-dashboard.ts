import type { AppRole } from "@/modules/users/domain/roles";

export type DashboardSessionUser = {
  email: string;
  id: string;
  name: string | null;
  role: AppRole;
};

export type DashboardAccessResult =
  | {
      allowed: true;
      user: DashboardSessionUser;
    }
  | {
      allowed: false;
      reason: "forbidden" | "unauthenticated";
    };

export function authorizeOwnerDashboardAccess(
  user: DashboardSessionUser | null,
): DashboardAccessResult {
  if (!user) {
    return {
      allowed: false,
      reason: "unauthenticated",
    };
  }

  if (user.role !== "owner") {
    return {
      allowed: false,
      reason: "forbidden",
    };
  }

  return {
    allowed: true,
    user,
  };
}
