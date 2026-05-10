"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getOwnerShippingSettingsUseCase,
  updateOwnerShippingSettingsUseCase,
} from "@/modules/shipping/application/manage-owner-shipping-settings";
import { testOwnerNovaPostConnectionUseCase } from "@/modules/shipping/application/test-owner-nova-post-connection";
import {
  getLazyApplicationEncryptionService,
} from "@/modules/shipping/infrastructure/application-encryption-service-factory";
import { ApplicationEncryptionConfigurationError } from "@/modules/shipping/infrastructure/node-application-encryption-service";
import { getOwnerNovaPostConnectionTester } from "@/modules/shipping/infrastructure/owner-nova-post-connection-tester-factory";
import { getOwnerShippingSettingsRepository } from "@/modules/shipping/infrastructure/owner-shipping-settings-repository-factory";
import type {
  OwnerShippingConnectionTestActionState,
  OwnerShippingSettingsActionState,
} from "@/modules/shipping/ui/owner-shipping-settings-action-state";
import { ownerShippingSettingsInputFromFormData } from "@/modules/shipping/ui/owner-shipping-settings-form-data";
import { ownerShippingSettingsFormValuesFromReadModel } from "@/modules/shipping/ui/owner-shipping-settings-form-data";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

export async function updateOwnerShippingSettingsAction(
  _state: OwnerShippingSettingsActionState,
  formData: FormData,
): Promise<OwnerShippingSettingsActionState> {
  const owner = await requireOwnerSession();
  const repository = getOwnerShippingSettingsRepository();

  try {
    const savedSettings = await updateOwnerShippingSettingsUseCase(
      ownerShippingSettingsInputFromFormData(formData, owner.id),
      {
        encryptionService: getLazyApplicationEncryptionService(),
        ownerShippingSettingsRepository: repository,
      },
    );

    revalidateSettingsPaths();

    return {
      fieldErrors: {},
      message: "Налаштування доставки збережено",
      ok: true,
      settings: ownerShippingSettingsFormValuesFromReadModel(savedSettings),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResult(error);
    }

    if (error instanceof ApplicationEncryptionConfigurationError) {
      return {
        fieldErrors: {
          apiKey: [
            "Налаштуйте APP_ENCRYPTION_KEY перед збереженням API ключа.",
          ],
        },
        message: "Не вдалося зашифрувати API ключ",
        ok: false,
      };
    }

    throw error;
  }
}

export async function testOwnerNovaPostConnectionAction(): Promise<
  OwnerShippingConnectionTestActionState
> {
  const owner = await requireOwnerSession();

  try {
    const result = await testOwnerNovaPostConnectionUseCase(
      {
        ownerId: owner.id,
      },
      {
        connectionTester: getOwnerNovaPostConnectionTester(),
        encryptionService: getLazyApplicationEncryptionService(),
        ownerShippingSettingsRepository: getOwnerShippingSettingsRepository(),
      },
    );

    return {
      checkedAtIso: result.checkedAt.toISOString(),
      message: result.message,
      ok: result.ok,
    };
  } catch (error) {
    if (error instanceof ApplicationEncryptionConfigurationError) {
      return {
        checkedAtIso: new Date().toISOString(),
        message: "Налаштуйте APP_ENCRYPTION_KEY перед перевіркою підключення.",
        ok: false,
      };
    }

    throw error;
  }
}

async function loadCurrentSettingsForOwner(ownerId: string) {
  return getOwnerShippingSettingsUseCase(
    {
      ownerId,
    },
    {
      ownerShippingSettingsRepository: getOwnerShippingSettingsRepository(),
    },
  );
}

function validationErrorResult(
  error: z.ZodError,
): OwnerShippingSettingsActionState {
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
    message: "Перевірте налаштування доставки",
    ok: false,
  };
}

function revalidateSettingsPaths() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/shipping");
}

export async function getOwnerShippingSettingsForPage(ownerId: string) {
  return ownerShippingSettingsFormValuesFromReadModel(
    await loadCurrentSettingsForOwner(ownerId),
  );
}
