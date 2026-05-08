export function formatOrderDisplayNumber(orderId: string): string {
  return `#${orderId.slice(0, 8)}`;
}
