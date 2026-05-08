export function formatMoneyMinor(amountMinor: number, currency: string): string {
  const amount = new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);

  return `${amount}\u00A0${currencySymbol(currency)}`;
}

function currencySymbol(currency: string): string {
  if (currency === "UAH") {
    return "₴";
  }

  return currency;
}
