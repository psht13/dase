import { z } from "zod";
import { parseProductImageUrl } from "@/modules/catalog/domain/product-image-url";
import type { ProductImageInput } from "@/modules/catalog/application/product-repository";

const pricePattern = /^\d+([,.]\d{1,2})?$/;
const wholeNumberPattern = /^\d+$/;

export const productFormSchema = z.object({
  description: z.string().trim().max(1_000, "Опис має бути до 1000 символів"),
  imageUrls: z
    .array(
      z.object({
        url: z
          .string()
          .trim()
          .min(1, "Додайте посилання на зображення")
          .refine(isValidImageUrl, "Вкажіть коректне посилання на зображення"),
      }),
    )
    .min(1, "Додайте хоча б одне зображення"),
  isActive: z.boolean(),
  name: z
    .string()
    .trim()
    .min(2, "Вкажіть назву товару")
    .max(120, "Назва має бути до 120 символів"),
  price: z
    .string()
    .trim()
    .min(1, "Вкажіть ціну")
    .regex(pricePattern, "Вкажіть ціну у форматі 1200 або 1200,50")
    .refine((value) => parsePriceMinor(value) > 0, "Ціна має бути більшою за 0"),
  sku: z
    .string()
    .trim()
    .min(2, "Вкажіть артикул")
    .max(80, "Артикул має бути до 80 символів"),
  stockQuantity: z
    .string()
    .trim()
    .min(1, "Вкажіть залишок")
    .regex(wholeNumberPattern, "Залишок має бути цілим числом"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export type ValidatedProductInput = {
  description: string | null;
  images: ProductImageInput[];
  isActive: boolean;
  name: string;
  priceMinor: number;
  sku: string;
  stockQuantity: number;
};

export function parseProductFormValues(
  input: unknown,
): ValidatedProductInput {
  const values = productFormSchema.parse(input);

  return toValidatedProductInput(values);
}

export function safeParseProductFormValues(input: unknown):
  | {
      data: ValidatedProductInput;
      success: true;
    }
  | {
      error: z.ZodError<ProductFormValues>;
      success: false;
    } {
  const result = productFormSchema.safeParse(input);

  if (!result.success) {
    return result;
  }

  return {
    data: toValidatedProductInput(result.data),
    success: true,
  };
}

export function priceMinorToFormValue(priceMinor: number): string {
  const major = Math.floor(priceMinor / 100);
  const minor = priceMinor % 100;

  return minor === 0 ? String(major) : `${major}.${String(minor).padStart(2, "0")}`;
}

function toValidatedProductInput(
  values: ProductFormValues,
): ValidatedProductInput {
  return {
    description: values.description.trim() || null,
    images: values.imageUrls.map((image, index) => ({
      sortOrder: index,
      url: parseProductImageUrl(image.url),
    })),
    isActive: values.isActive,
    name: values.name.trim(),
    priceMinor: parsePriceMinor(values.price),
    sku: values.sku.trim(),
    stockQuantity: Number(values.stockQuantity),
  };
}

function parsePriceMinor(value: string): number {
  const [major, minor = ""] = value.trim().replace(",", ".").split(".");

  return Number(major) * 100 + Number(minor.padEnd(2, "0"));
}

function isValidImageUrl(value: string): boolean {
  try {
    parseProductImageUrl(value);
    return true;
  } catch {
    return false;
  }
}
