import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authorizeOwnerDashboardAccess } from "@/modules/users/application/authorize-owner-dashboard";
import type { DashboardSessionUser } from "@/modules/users/application/authorize-owner-dashboard";
import { getSessionUserFromHeaders } from "@/modules/users/infrastructure/auth-session";

export async function requireOwnerSession(): Promise<DashboardSessionUser> {
  const requestHeaders = await headers();
  const user = await getSessionUserFromHeaders(requestHeaders);
  const access = authorizeOwnerDashboardAccess(user);

  if (!access.allowed) {
    redirect(access.reason === "unauthenticated" ? "/login" : "/");
  }

  return access.user;
}
