import type { ApplicationEncryptionService } from "@/modules/shipping/application/application-encryption-service";
import type { OwnerShippingSettingsRepository } from "@/modules/shipping/application/owner-shipping-settings-repository";
import type {
  NovaPostApiEnvironment,
  NovaPostPayerType,
} from "@/modules/shipping/domain/owner-shipping-settings";

export type OwnerNovaPostConnectionTestInput = {
  apiBaseUrl: string;
  apiEnvironment: NovaPostApiEnvironment;
  apiKey: string;
  authUrl: string | null;
  ownerId: string;
  payerContractNumber: string | null;
  payerType: NovaPostPayerType;
  senderCountryCode: string;
  senderDivisionId: string;
  senderName: string;
  senderPhone: string;
};

export type OwnerNovaPostConnectionTestResult = {
  directoryResultCount: number;
};

export interface OwnerNovaPostConnectionTester {
  testConnection(
    input: OwnerNovaPostConnectionTestInput,
  ): Promise<OwnerNovaPostConnectionTestResult>;
}

export type TestOwnerNovaPostConnectionUseCaseResult = {
  checkedAt: Date;
  message: string;
  ok: boolean;
};

type TestOwnerNovaPostConnectionDependencies = {
  connectionTester: OwnerNovaPostConnectionTester;
  encryptionService: ApplicationEncryptionService;
  ownerShippingSettingsRepository: OwnerShippingSettingsRepository;
};

export async function testOwnerNovaPostConnectionUseCase(
  input: {
    ownerId: string;
  },
  dependencies: TestOwnerNovaPostConnectionDependencies,
): Promise<TestOwnerNovaPostConnectionUseCaseResult> {
  const settings =
    await dependencies.ownerShippingSettingsRepository.findByOwnerId(
      input.ownerId,
    );

  if (!settings) {
    return failure("Спочатку збережіть налаштування доставки.");
  }

  if (!settings.apiKeyEncrypted) {
    return failure("Збережіть API ключ Nova Post перед перевіркою.");
  }

  try {
    const apiKey = await dependencies.encryptionService.decrypt(
      settings.apiKeyEncrypted,
    );

    await dependencies.connectionTester.testConnection({
      apiBaseUrl: settings.apiBaseUrl,
      apiEnvironment: settings.apiEnvironment,
      apiKey,
      authUrl: settings.authUrl,
      ownerId: settings.ownerId,
      payerContractNumber: settings.payerContractNumber,
      payerType: settings.payerType,
      senderCountryCode: settings.senderCountryCode,
      senderDivisionId: settings.senderDivisionId,
      senderName: settings.senderName,
      senderPhone: settings.senderPhone,
    });
  } catch {
    return failure(
      "Не вдалося перевірити підключення. Перевірте API ключ і URL Nova Post.",
    );
  }

  return {
    checkedAt: new Date(),
    message: "Підключення працює. Авторизація Nova Post і тестовий пошук доступні.",
    ok: true,
  };
}

function failure(message: string): TestOwnerNovaPostConnectionUseCaseResult {
  return {
    checkedAt: new Date(),
    message,
    ok: false,
  };
}
