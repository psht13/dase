import {
  ownerShippingSettingsInputSchema,
  safeParseOwnerShippingSettingsInput,
} from "@/modules/shipping/application/owner-shipping-settings-validation";

const validInput = {
  apiBaseUrl: "https://api-stage.novapost.pl/v.1.0/",
  apiEnvironment: "stage",
  apiKey: "stage-secret-key",
  authUrl: "",
  defaultActualWeightGrams: "500",
  defaultHeightMm: "100",
  defaultLengthMm: "300",
  defaultVolumetricWeightGrams: "500",
  defaultWidthMm: "200",
  isEnabled: true,
  ownerId: "owner-1",
  payerContractNumber: "",
  payerType: "Recipient",
  senderCompanyName: "",
  senderCompanyTin: "",
  senderCountryCode: "ua",
  senderDivisionId: "11759",
  senderEmail: "",
  senderName: "Тестова Тетяна",
  senderPhone: "380007654321",
} as const;

describe("ownerShippingSettingsInputSchema", () => {
  it("validates the official endpoint selector and normalizes sender data", () => {
    const result = ownerShippingSettingsInputSchema.parse(validInput);

    expect(result.apiBaseUrl).toBe("https://api-stage.novapost.pl/v.1.0/");
    expect(result.senderCountryCode).toBe("UA");
    expect(result.senderEmail).toBeNull();
    expect(result.defaultWidthMm).toBe(200);
  });

  it("rejects endpoint URLs that do not match the selected environment", () => {
    expect(() =>
      ownerShippingSettingsInputSchema.parse({
        ...validInput,
        apiBaseUrl: "https://api.novapost.com/v.1.0/",
      }),
    ).toThrow(/Адреса API має відповідати вибраному середовищу/);
  });

  it("validates custom URLs", () => {
    expect(
      ownerShippingSettingsInputSchema.parse({
        ...validInput,
        apiBaseUrl: "https://proxy.example.com/nova-post/v.1.0",
        apiEnvironment: "custom",
      }).apiBaseUrl,
    ).toBe("https://proxy.example.com/nova-post/v.1.0/");

    expect(() =>
      ownerShippingSettingsInputSchema.parse({
        ...validInput,
        apiBaseUrl: "http://proxy.example.com/nova-post",
        apiEnvironment: "custom",
      }),
    ).toThrow(/HTTPS URL/);
  });

  it("validates sender, parcel, and payer settings", () => {
    expect(
      safeParseOwnerShippingSettingsInput({
        ...validInput,
        defaultWidthMm: 0,
      }).success,
    ).toBe(false);
    expect(
      safeParseOwnerShippingSettingsInput({
        ...validInput,
        senderCountryCode: "UKR",
      }).success,
    ).toBe(false);
    expect(() =>
      ownerShippingSettingsInputSchema.parse({
        ...validInput,
        payerContractNumber: "",
        payerType: "ThirdPerson",
      }),
    ).toThrow(/номер договору/);
  });
});
