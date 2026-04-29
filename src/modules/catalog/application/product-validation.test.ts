import {
  parseProductFormValues,
  priceMinorToFormValue,
  productFormSchema,
} from "./product-validation";

describe("product validation", () => {
  it("parses product form values into repository input", () => {
    expect(
      parseProductFormValues({
        description: " Срібна каблучка ",
        imageUrls: [{ url: " https://example.com/ring.jpg " }],
        isActive: true,
        name: " Каблучка ",
        price: "1200,50",
        sku: " RING-1 ",
        stockQuantity: "3",
      }),
    ).toMatchObject({
      description: "Срібна каблучка",
      images: [{ sortOrder: 0, url: "https://example.com/ring.jpg" }],
      isActive: true,
      name: "Каблучка",
      priceMinor: 120_050,
      sku: "RING-1",
      stockQuantity: 3,
    });
  });

  it("returns Ukrainian validation messages", () => {
    const result = productFormSchema.safeParse({
      description: "",
      imageUrls: [{ url: "data:image/png;base64,abc" }],
      isActive: true,
      name: "",
      price: "0",
      sku: "",
      stockQuantity: "1.5",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          "Вкажіть назву товару",
          "Вкажіть артикул",
          "Ціна має бути більшою за 0",
          "Залишок має бути цілим числом",
          "Вкажіть коректне посилання на зображення",
        ]),
      );
    }
  });

  it("formats minor units for edit forms", () => {
    expect(priceMinorToFormValue(120_000)).toBe("1200");
    expect(priceMinorToFormValue(120_050)).toBe("1200.50");
  });
});
