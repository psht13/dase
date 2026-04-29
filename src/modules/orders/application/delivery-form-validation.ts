import { z } from "zod";
import type { PaymentProvider } from "@/modules/payments/application/payment-repository";
import type { ShipmentCarrier } from "@/modules/shipping/application/shipment-repository";

const shipmentCarriers = ["NOVA_POSHTA", "UKRPOSHTA"] as const;
const paymentProviders = ["MONOBANK", "CASH_ON_DELIVERY"] as const;

export const deliveryFormSchema = z.object({
  carrier: z
    .string()
    .refine((value) => isShipmentCarrierValue(value), "Оберіть службу доставки"),
  cityId: z.string().trim().min(1, "Оберіть місто зі списку"),
  cityName: z.string().trim().min(1, "Оберіть місто зі списку"),
  fullName: z
    .string()
    .trim()
    .min(2, "Вкажіть ім’я та прізвище")
    .max(120, "Ім’я має бути до 120 символів"),
  paymentMethod: z
    .string()
    .refine((value) => isPaymentProviderValue(value), "Оберіть спосіб оплати"),
  phone: z
    .string()
    .trim()
    .min(1, "Вкажіть телефон")
    .refine(
      (value) => phonePattern.test(normalizePhone(value)),
      "Вкажіть телефон у форматі +380XXXXXXXXX",
    ),
  warehouseAddress: z.string().trim(),
  warehouseId: z.string().trim().min(1, "Оберіть відділення зі списку"),
  warehouseName: z.string().trim().min(1, "Оберіть відділення зі списку"),
});

const phonePattern = /^\+380\d{9}$/;

export type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;

export type ValidatedDeliveryInput = {
  carrier: ShipmentCarrier;
  cityId: string;
  cityName: string;
  fullName: string;
  paymentMethod: PaymentProvider;
  phone: string;
  warehouseAddress: string | null;
  warehouseId: string;
  warehouseName: string;
};

export function safeParseDeliveryFormValues(input: unknown):
  | {
      data: ValidatedDeliveryInput;
      success: true;
    }
  | {
      error: z.ZodError<DeliveryFormValues>;
      success: false;
    } {
  const result = deliveryFormSchema.safeParse(input);

  if (!result.success) {
    return result;
  }

  return {
    data: toValidatedDeliveryInput(result.data),
    success: true,
  };
}

function toValidatedDeliveryInput(
  values: DeliveryFormValues,
): ValidatedDeliveryInput {
  return {
    carrier: values.carrier as ShipmentCarrier,
    cityId: values.cityId.trim(),
    cityName: values.cityName.trim(),
    fullName: values.fullName.trim(),
    paymentMethod: values.paymentMethod as PaymentProvider,
    phone: normalizePhone(values.phone),
    warehouseAddress: values.warehouseAddress.trim() || null,
    warehouseId: values.warehouseId.trim(),
    warehouseName: values.warehouseName.trim(),
  };
}

function normalizePhone(value: string): string {
  return value.trim().replace(/[\s()-]/g, "");
}

function isShipmentCarrierValue(value: string): boolean {
  return (shipmentCarriers as readonly string[]).includes(value);
}

function isPaymentProviderValue(value: string): boolean {
  return (paymentProviders as readonly string[]).includes(value);
}
