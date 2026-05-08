import { NextResponse } from "next/server";
import { resetAuthForTests } from "@/modules/users/infrastructure/auth";
import { resetPaymentRequisiteRepositoryForTests } from "@/modules/payments/infrastructure/payment-requisite-repository-factory";
import { resetCredentialAuthServiceForTests } from "@/modules/users/infrastructure/credential-auth-service-factory";
import {
  isE2eAuthMemoryEnabled,
  resetE2eAuthMemoryDb,
} from "@/modules/users/infrastructure/e2e-auth-memory-store";
import { resetOwnerSetupLockForTests } from "@/modules/users/infrastructure/owner-setup-lock-factory";
import { resetUserRepositoryForTests } from "@/modules/users/infrastructure/user-repository-factory";

export async function POST() {
  if (!isE2eAuthMemoryEnabled()) {
    return NextResponse.json({ message: "Недоступно" }, { status: 404 });
  }

  resetE2eAuthMemoryDb();
  resetAuthForTests();
  resetCredentialAuthServiceForTests();
  resetOwnerSetupLockForTests();
  resetPaymentRequisiteRepositoryForTests();
  resetUserRepositoryForTests();

  return NextResponse.json({ ok: true });
}
