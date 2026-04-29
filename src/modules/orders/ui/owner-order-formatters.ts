export function formatMoneyMinor(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("uk-UA", {
    currency,
    style: "currency",
  }).format(amountMinor / 100);
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
