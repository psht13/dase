import { safeParseDeliveryFormValues } from "./delivery-form-validation";

describe("delivery form validation", () => {
  it("validates and normalizes customer delivery data", () => {
    const result = safeParseDeliveryFormValues({
      carrier: "NOVA_POSHTA",
      cityId: "city-1",
      cityName: " Київ ",
      fullName: " Олена Петренко ",
      paymentMethod: "CASH_ON_DELIVERY",
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
        paymentMethod: "CASH_ON_DELIVERY",
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
});
