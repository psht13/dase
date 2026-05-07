"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createFirstOwnerUseCase,
  FirstOwnerSetupUnavailableError,
  isOwnerSetupTokenValid,
} from "@/modules/users/application/owner-setup";
import { ownerSetupFormSchema } from "@/modules/users/application/owner-setup-validation";
import { getCredentialAuthService } from "@/modules/users/infrastructure/credential-auth-service-factory";
import { getOwnerSetupLock } from "@/modules/users/infrastructure/owner-setup-lock-factory";
import { getUserRepository } from "@/modules/users/infrastructure/user-repository-factory";
import type { OwnerSetupActionState } from "@/modules/users/ui/owner-setup-action-state";
import { getWebEnv } from "@/shared/config/env";

export async function createFirstOwnerAction(
  _previousState: OwnerSetupActionState,
  formData: FormData,
): Promise<OwnerSetupActionState> {
  const parsed = ownerSetupFormSchema.safeParse({
    email: formValue(formData, "email"),
    name: formValue(formData, "name"),
    password: formValue(formData, "password"),
    setupToken: formValue(formData, "setupToken"),
  });

  if (!parsed.success) {
    return validationErrorResult(parsed.error);
  }

  const env = getWebEnv({ requireOwnerSetupToken: true });

  if (
    !isOwnerSetupTokenValid({
      expectedToken: env.OWNER_SETUP_TOKEN,
      nodeEnv: env.NODE_ENV,
      submittedToken: parsed.data.setupToken,
    })
  ) {
    return {
      fieldErrors: {
        setupToken: ["Вкажіть правильний токен налаштування"],
      },
      message: "Токен налаштування недійсний або відсутній",
      ok: false,
    };
  }

  try {
    await createFirstOwnerUseCase(parsed.data, {
      credentialAuthService: getCredentialAuthService(),
      ownerSetupLock: getOwnerSetupLock(),
      userRepository: getUserRepository(),
    });
  } catch (error) {
    if (error instanceof FirstOwnerSetupUnavailableError) {
      return {
        message: "Перший власник уже створений. Увійдіть до кабінету.",
        ok: false,
      };
    }

    return {
      message:
        "Не вдалося створити власника. Перевірте дані або використайте іншу пошту.",
      ok: false,
    };
  }

  await clearBetterAuthSessionCookies();
  redirect("/login?setup=created");
}

function validationErrorResult(error: z.ZodError): OwnerSetupActionState {
  const flattenedFieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;

  return {
    fieldErrors: Object.fromEntries(
      Object.entries(flattenedFieldErrors).map(([field, messages = []]) => [
        field,
        messages.filter(Boolean),
      ]),
    ),
    message: "Перевірте дані першого власника",
    ok: false,
  };
}

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

async function clearBetterAuthSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookieNames = [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
    "better-auth.session_data",
    "__Secure-better-auth.session_data",
    "better-auth.dont_remember",
    "__Secure-better-auth.dont_remember",
  ];

  for (const name of sessionCookieNames) {
    cookieStore.delete(name);
  }
}
