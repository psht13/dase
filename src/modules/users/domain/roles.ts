export const appRoles = ["owner", "user"] as const;

export type AppRole = (typeof appRoles)[number];

export const defaultUserRole: AppRole = "user";

export function isAppRole(role: string): role is AppRole {
  return appRoles.includes(role as AppRole);
}

export function parseAppRole(role: string): AppRole {
  if (!isAppRole(role)) {
    throw new Error(`Unsupported user role: ${role}`);
  }

  return role;
}
