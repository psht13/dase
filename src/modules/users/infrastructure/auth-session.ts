import type { DashboardSessionUser } from "@/modules/users/application/authorize-owner-dashboard";
import { isAppRole } from "@/modules/users/domain/roles";
import { getAuth } from "@/modules/users/infrastructure/auth";

const e2eRoleCookieName = "dase_e2e_role";
const e2eUserIdCookieName = "dase_e2e_user_id";
const e2eEmailCookieName = "dase_e2e_email";

export async function getSessionUserFromHeaders(
  requestHeaders: Headers,
): Promise<DashboardSessionUser | null> {
  if (isE2eSessionEnabled()) {
    return getE2eSessionUser(requestHeaders);
  }

  const session = await getAuth().api.getSession({
    headers: requestHeaders,
  });

  if (!session?.user) {
    return null;
  }

  const role = String(session.user.role ?? "");

  if (!isAppRole(role)) {
    return null;
  }

  return {
    email: session.user.email,
    id: session.user.id,
    name: session.user.name ?? null,
    role,
  };
}

function getE2eSessionUser(
  requestHeaders: Headers,
): DashboardSessionUser | null {
  if (!isE2eSessionEnabled()) {
    return null;
  }

  const cookies = parseCookieHeader(requestHeaders.get("cookie") ?? "");
  const role = cookies.get(e2eRoleCookieName);

  if (!role || !isAppRole(role)) {
    return null;
  }

  return {
    email: cookies.get(e2eEmailCookieName) ?? "owner.e2e@example.com",
    id: cookies.get(e2eUserIdCookieName) ?? "00000000-0000-4000-8000-000000000001",
    name: "Тестовий власник",
    role,
  };
}

function isE2eSessionEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1";
}

function parseCookieHeader(cookieHeader: string): Map<string, string> {
  const cookies = new Map<string, string>();

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");

    if (!rawName || !rawValue.length) {
      continue;
    }

    cookies.set(rawName, decodeURIComponent(rawValue.join("=")));
  }

  return cookies;
}
