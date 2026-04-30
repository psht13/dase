"use server";

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
import { getServerEnv } from "@/shared/config/env";

export type OwnerSetupActionState = {
  fieldErrors?: Record<string, string[]>;
  message: string | null;
  ok: boolean;
};

export const initialOwnerSetupActionState: OwnerSetupActionState = {
  message: null,
  ok: false,
};

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

  const env = getServerEnv();

  if (
    !isOwnerSetupTokenValid({
      expectedToken: env.OWNER_SETUP_TOKEN,
      nodeEnv: env.NODE_ENV,
      submittedToken: parsed.data.setupToken,
    })
  ) {
    return {
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
