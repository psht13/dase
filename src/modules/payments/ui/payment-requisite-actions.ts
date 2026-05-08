"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createPaymentRequisiteUseCase,
  PaymentRequisiteNotFoundError,
  setPaymentRequisiteActiveUseCase,
  updatePaymentRequisiteUseCase,
} from "@/modules/payments/application/manage-payment-requisites";
import { safeParsePaymentRequisiteInput } from "@/modules/payments/application/payment-requisite-validation";
import { getPaymentRequisiteRepository } from "@/modules/payments/infrastructure/payment-requisite-repository-factory";
import type { PaymentRequisiteActionState } from "@/modules/payments/ui/payment-requisite-action-state";
import { paymentRequisiteInputFromFormData } from "@/modules/payments/ui/payment-requisite-form-data";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

export async function createPaymentRequisiteAction(
  _state: PaymentRequisiteActionState,
  formData: FormData,
): Promise<PaymentRequisiteActionState> {
  const owner = await requireOwnerSession();
  const parsed = safeParsePaymentRequisiteInput(
    paymentRequisiteInputFromFormData(formData),
  );

  if (!parsed.success) {
    return validationErrorResult(parsed.error);
  }

  await createPaymentRequisiteUseCase(
    {
      ...parsed.data,
      ownerId: owner.id,
    },
    { paymentRequisiteRepository: getPaymentRequisiteRepository() },
  );

  revalidateSettingsPaths();

  return {
    fieldErrors: {},
    message: "Реквізити додано",
    ok: true,
  };
}

export async function updatePaymentRequisiteAction(
  requisiteId: string,
  _state: PaymentRequisiteActionState,
  formData: FormData,
): Promise<PaymentRequisiteActionState> {
  const owner = await requireOwnerSession();
  const parsed = safeParsePaymentRequisiteInput(
    paymentRequisiteInputFromFormData(formData),
  );

  if (!parsed.success) {
    return validationErrorResult(parsed.error);
  }

  try {
    await updatePaymentRequisiteUseCase(
      {
        ...parsed.data,
        ownerId: owner.id,
        requisiteId,
      },
      { paymentRequisiteRepository: getPaymentRequisiteRepository() },
    );
  } catch (error) {
    if (error instanceof PaymentRequisiteNotFoundError) {
      return {
        fieldErrors: {},
        message: "Реквізити не знайдено",
        ok: false,
      };
    }

    throw error;
  }

  revalidateSettingsPaths();

  return {
    fieldErrors: {},
    message: "Реквізити оновлено",
    ok: true,
  };
}

export async function setPaymentRequisiteActiveAction(
  requisiteId: string,
  isActive: boolean,
): Promise<void> {
  const owner = await requireOwnerSession();

  await setPaymentRequisiteActiveUseCase(
    {
      isActive,
      ownerId: owner.id,
      requisiteId,
    },
    { paymentRequisiteRepository: getPaymentRequisiteRepository() },
  );

  revalidateSettingsPaths();
}

function validationErrorResult(
  error: z.ZodError,
): PaymentRequisiteActionState {
  const flattenedFieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const fieldErrors = Object.fromEntries(
    Object.entries(flattenedFieldErrors).map(([field, messages = []]) => [
      field,
      messages.filter(Boolean),
    ]),
  );

  return {
    fieldErrors,
    message: "Перевірте реквізити",
    ok: false,
  };
}

function revalidateSettingsPaths() {
  revalidatePath("/dashboard/settings/payment");
  revalidatePath("/dashboard/orders");
}
