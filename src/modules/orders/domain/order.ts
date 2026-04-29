export type MoneyMinor = number;

export type ProductSnapshotSource = {
  id: string;
  name: string;
  sku: string;
  unitPriceMinor: MoneyMinor;
};

export type OrderItemSnapshot = {
  lineTotalMinor: MoneyMinor;
  productId: string | null;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  quantity: number;
  unitPriceMinor: MoneyMinor;
};

function assertNonNegativeMinorUnits(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer in minor units`);
  }
}

export function assertValidQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Order item quantity must be a positive integer");
  }
}

export function createOrderItemFromProductSnapshot(
  product: ProductSnapshotSource,
  quantity: number,
): OrderItemSnapshot {
  assertValidQuantity(quantity);
  assertNonNegativeMinorUnits(product.unitPriceMinor, "Unit price");

  return {
    lineTotalMinor: product.unitPriceMinor * quantity,
    productId: product.id,
    productNameSnapshot: product.name,
    productSkuSnapshot: product.sku,
    quantity,
    unitPriceMinor: product.unitPriceMinor,
  };
}

export function calculateOrderTotal(
  items: readonly Pick<OrderItemSnapshot, "lineTotalMinor">[],
): MoneyMinor {
  return items.reduce((total, item) => {
    assertNonNegativeMinorUnits(item.lineTotalMinor, "Line total");

    return total + item.lineTotalMinor;
  }, 0);
}
