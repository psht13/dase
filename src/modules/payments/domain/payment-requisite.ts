export function maskPaymentRequisiteDisplayValue(displayValue: string): string {
  const trimmedValue = displayValue.trim();
  const digitsOnly = trimmedValue.replace(/\D/g, "");

  if (digitsOnly.length >= 8) {
    return `•••• ${digitsOnly.slice(-4)}`;
  }

  if (trimmedValue.length > 16) {
    return `${trimmedValue.slice(0, 4)}…${trimmedValue.slice(-4)}`;
  }

  return trimmedValue;
}
