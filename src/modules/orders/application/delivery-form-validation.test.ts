import { safeParseDeliveryFormValues } from "./delivery-form-validation";

describe("delivery form validation", () => {
  it("validates and normalizes customer delivery data", () => {
    const result = safeParseDeliveryFormValues({
      carrier: "NOVA_POSHTA",
      cityId: "city-1",
      cityName: " Київ ",
      fullName: " Олена Петренко ",
      instagramUsername: " @@olena.shop_123 ",
      paymentMethod: "MANUAL_CARD_TRANSFER",
      phone: "+380 (67) 123-45-67",
      warehouseAddress: " вул. Хрещатик, 1 ",
      warehouseId: "warehouse-1",
      warehouseName: " Відділення №1 ",
    });

    expect(result).toEqual({
      data: {
        carrier: "NOVA_POSHTA",
        cityId: "city-1",
        cityName: "Київ",
        fullName: "Олена Петренко",
        instagramUsername: "olena.shop_123",
        paymentMethod: "MANUAL_CARD_TRANSFER",
        phone: "+380671234567",
        warehouseAddress: "вул. Хрещатик, 1",
        warehouseId: "warehouse-1",
        warehouseName: "Відділення №1",
      },
      success: true,
    });
  });

  it("returns Ukrainian validation messages", () => {
    const result = safeParseDeliveryFormValues({
      carrier: "",
      cityId: "",
      cityName: "",
      fullName: "",
      instagramUsername: "",
      paymentMethod: "",
      phone: "123",
      warehouseAddress: "",
      warehouseId: "",
      warehouseName: "",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;

      expect(errors.fullName).toContain("Вкажіть ім’я та прізвище");
      expect(errors.phone).toContain("Вкажіть телефон у форматі +380XXXXXXXXX");
      expect(errors.cityId).toContain("Оберіть місто зі списку");
      expect(errors.warehouseId).toContain("Оберіть відділення зі списку");
      expect(errors.paymentMethod).toContain("Оберіть спосіб оплати");
    }
  });

  it("keeps Nova Post as the only active delivery carrier", () => {
    const result = safeParseDeliveryFormValues({
      carrier: "UKRPOSHTA",
      cityId: "city-1",
      cityName: "Київ",
      fullName: "Олена Петренко",
      instagramUsername: "",
      paymentMethod: "CASH_ON_DELIVERY",
      phone: "+380671234567",
      warehouseAddress: "вул. Хрещатик, 1",
      warehouseId: "warehouse-1",
      warehouseName: "Відділення №1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects MonoPay from the active customer payment choices", () => {
    const result = safeParseDeliveryFormValues({
      carrier: "NOVA_POSHTA",
      cityId: "city-1",
      cityName: "Київ",
      fullName: "Олена Петренко",
      instagramUsername: "",
      paymentMethod: "MONOBANK",
      phone: "+380671234567",
      warehouseAddress: "вул. Хрещатик, 1",
      warehouseId: "warehouse-1",
      warehouseName: "Відділення №1",
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ["username", "username"],
    ["@username", "username"],
    ["user.name_123", "user.name_123"],
  ])("accepts Instagram nickname %s", (value, expected) => {
    const result = safeParseDeliveryFormValues({
      carrier: "NOVA_POSHTA",
      cityId: "city-1",
      cityName: "Київ",
      fullName: "Олена Петренко",
      instagramUsername: value,
      paymentMethod: "CASH_ON_DELIVERY",
      phone: "+380671234567",
      warehouseAddress: "вул. Хрещатик, 1",
      warehouseId: "warehouse-1",
      warehouseName: "Відділення №1",
    });

    expect(result).toMatchObject({
      data: {
        instagramUsername: expected,
      },
      success: true,
    });
  });

  it.each([
    "user name",
    "this_username_is_more_than_thirty_characters",
    "user-name!",
  ])("rejects invalid Instagram nickname %s", (value) => {
    const result = safeParseDeliveryFormValues({
      carrier: "NOVA_POSHTA",
      cityId: "city-1",
      cityName: "Київ",
      fullName: "Олена Петренко",
      instagramUsername: value,
      paymentMethod: "CASH_ON_DELIVERY",
      phone: "+380671234567",
      warehouseAddress: "вул. Хрещатик, 1",
      warehouseId: "warehouse-1",
      warehouseName: "Відділення №1",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.flatten().fieldErrors.instagramUsername).toContain(
        "Вкажіть Instagram нікнейм у форматі username або @username",
      );
    }
  });
});
