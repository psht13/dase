import { formatOrderDisplayNumber } from "@/modules/orders/application/order-display-number";
import { formatMoneyMinor as formatSharedMoneyMinor } from "@/shared/utils/format-money";

export function formatMoneyMinor(amountMinor: number, currency: string): string {
  return formatSharedMoneyMinor(amountMinor, currency);
}

export function formatDateTime(date: Date | null): string {
  if (!date) {
    return "Не вказано";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function displayOrderNumber(orderId: string): string {
  return formatOrderDisplayNumber(orderId);
}

export function shortOrderId(orderId: string): string {
  return displayOrderNumber(orderId).slice(1);
}
