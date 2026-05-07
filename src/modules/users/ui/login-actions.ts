"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { ownerLoginFormSchema } from "@/modules/users/application/login-validation";
import { getAuth } from "@/modules/users/infrastructure/auth";
import type { LoginActionState } from "@/modules/users/ui/login-action-state";

export async function loginOwnerAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = ownerLoginFormSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return validationErrorResult(parsed.error);
  }

  try {
    await getAuth().api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: true,
      },
      headers: await headers(),
    });
  } catch {
    return {
      message: "Електронна пошта або пароль неправильні",
      ok: false,
    };
  }

  return {
    message: null,
    ok: true,
  };
}

function validationErrorResult(error: z.ZodError): LoginActionState {
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
    message: "Перевірте дані входу",
    ok: false,
  };
}

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}
