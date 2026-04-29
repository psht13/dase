export const appRoles = ["owner", "user"] as const;

export type AppRole = (typeof appRoles)[number];

export const defaultUserRole: AppRole = "user";
