import type { ReactNode } from "react";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const owner = await requireOwnerSession();

  return <DashboardShell ownerEmail={owner.email}>{children}</DashboardShell>;
}
