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

export function shortOrderId(orderId: string): string {
  return orderId.slice(0, 8);
}
