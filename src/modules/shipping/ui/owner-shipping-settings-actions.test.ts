import { InMemoryOwnerShippingSettingsRepository } from "@/modules/shipping/infrastructure/in-memory-owner-shipping-settings-repository";
import {
  initialOwnerShippingSettingsActionState,
} from "@/modules/shipping/ui/owner-shipping-settings-action-state";
import {
  testOwnerNovaPostConnectionAction,
  updateOwnerShippingSettingsAction,
} from "@/modules/shipping/ui/owner-shipping-settings-actions";

const mocks = vi.hoisted(() => ({
  getLazyApplicationEncryptionService: vi.fn(),
  getOwnerNovaPostConnectionTester: vi.fn(),
  getOwnerShippingSettingsRepository: vi.fn(),
  requireOwnerSession: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: mocks.requireOwnerSession,
}));

vi.mock(
  "@/modules/shipping/infrastructure/application-encryption-service-factory",
  () => ({
    getLazyApplicationEncryptionService: mocks.getLazyApplicationEncryptionService,
  }),
);

vi.mock(
  "@/modules/shipping/infrastructure/owner-nova-post-connection-tester-factory",
  () => ({
    getOwnerNovaPostConnectionTester: mocks.getOwnerNovaPostConnectionTester,
  }),
);

vi.mock(
  "@/modules/shipping/infrastructure/owner-shipping-settings-repository-factory",
  () => ({
    getOwnerShippingSettingsRepository:
      mocks.getOwnerShippingSettingsRepository,
  }),
);

const validFormValues = {
  apiBaseUrl: "https://api-stage.novapost.pl/v.1.0/",
  apiEnvironment: "stage",
  apiKey: "owner-nova-post-secret-7890",
  authUrl: "",
  defaultActualWeightGrams: "500",
  defaultHeightMm: "100",
  defaultLengthMm: "300",
  defaultVolumetricWeightGrams: "500",
  defaultWidthMm: "200",
  isEnabled: "on",
  payerContractNumber: "",
  payerType: "Recipient",
  senderCompanyName: "",
  senderCompanyTin: "",
  senderCountryCode: "UA",
  senderDivisionId: "11759",
  senderEmail: "",
  senderName: "Олена Петренко",
  senderPhone: "+380671234567",
} as const;

describe("owner shipping settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOwnerSession.mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
  });

  it("returns Ukrainian validation for insecure custom URL", async () => {
    const repository = new InMemoryOwnerShippingSettingsRepository();

    mocks.getOwnerShippingSettingsRepository.mockReturnValue(repository);
    mocks.getLazyApplicationEncryptionService.mockReturnValue({
      decrypt: vi.fn(),
      encrypt: vi.fn(async (plaintext) => `encrypted:${plaintext}`),
    });

    const result = await updateOwnerShippingSettingsAction(
      initialOwnerShippingSettingsActionState,
      formDataFrom({
        ...validFormValues,
        apiBaseUrl: "http://example.test/v.1.0/",
        apiEnvironment: "custom",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.apiBaseUrl?.[0]).toContain("HTTPS URL");
    expect(result.message).toBe("Перевірте налаштування доставки");
  });

  it("tests the connection through saved encrypted settings without exposing the API key", async () => {
    const repository = new InMemoryOwnerShippingSettingsRepository();
    const connectionTester = {
      testConnection: vi.fn(async () => ({ directoryResultCount: 1 })),
    };
    const encryptionService = {
      decrypt: vi.fn(async (ciphertext: string) =>
        ciphertext.replace("encrypted:", ""),
      ),
      encrypt: vi.fn(),
    };

    await repository.save({
      apiBaseUrl: "https://api-stage.novapost.pl/v.1.0/",
      apiEnvironment: "stage",
      apiKeyEncrypted: "encrypted:owner-nova-post-secret-7890",
      apiKeyPreview: "****7890",
      authUrl: null,
      carrier: "NOVA_POST",
      defaultActualWeightGrams: 500,
      defaultHeightMm: 100,
      defaultLengthMm: 300,
      defaultVolumetricWeightGrams: 500,
      defaultWidthMm: 200,
      isEnabled: false,
      ownerId: "owner-1",
      payerContractNumber: null,
      payerType: "Recipient",
      senderCompanyName: null,
      senderCompanyTin: null,
      senderCountryCode: "UA",
      senderDivisionId: "11759",
      senderEmail: null,
      senderName: "Олена Петренко",
      senderPhone: "+380671234567",
    });

    mocks.getOwnerShippingSettingsRepository.mockReturnValue(repository);
    mocks.getLazyApplicationEncryptionService.mockReturnValue(encryptionService);
    mocks.getOwnerNovaPostConnectionTester.mockReturnValue(connectionTester);

    const result = await testOwnerNovaPostConnectionAction();

    expect(result.ok).toBe(true);
    expect(result.message).toContain("Підключення працює");
    expect(connectionTester.testConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        apiBaseUrl: "https://api-stage.novapost.pl/v.1.0/",
        apiKey: "owner-nova-post-secret-7890",
        ownerId: "owner-1",
      }),
    );
    expect(result.message).not.toContain("owner-nova-post-secret-7890");
  });
});

function formDataFrom(values: Record<string, string>): FormData {
  const formData = new FormData();

  formData.set("apiKeyConfigured", "false");

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}
