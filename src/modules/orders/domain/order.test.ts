import {
  assertValidQuantity,
  calculateOrderTotal,
  createOrderItemFromProductSnapshot,
} from "./order";
import {
  assertOrderStatusTransition,
  canTransitionOrderStatus,
  isOrderStatus,
} from "./status";

describe("order totals", () => {
  it("calculates totals from line amounts in minor units", () => {
    const items = [
      createOrderItemFromProductSnapshot(
        {
          id: "product-1",
          imageUrls: ["https://example.com/ring.jpg"],
          name: "Каблучка",
          sku: "RING-1",
          unitPriceMinor: 125_00,
        },
        2,
      ),
      createOrderItemFromProductSnapshot(
        {
          id: "product-2",
          name: "Сережки",
          sku: "EAR-1",
          unitPriceMinor: 50_50,
        },
        1,
      ),
    ];

    expect(calculateOrderTotal(items)).toBe(300_50);
  });

  it("rejects invalid line totals", () => {
    expect(() => calculateOrderTotal([{ lineTotalMinor: -1 }])).toThrow(
      /Line total/,
    );
  });
});

describe("order item quantities", () => {
  it("accepts positive integer quantities", () => {
    expect(() => assertValidQuantity(1)).not.toThrow();
    expect(() => assertValidQuantity(3)).not.toThrow();
  });

  it("rejects invalid quantities", () => {
    expect(() => assertValidQuantity(0)).toThrow(/positive integer/);
    expect(() => assertValidQuantity(-1)).toThrow(/positive integer/);
    expect(() => assertValidQuantity(1.5)).toThrow(/positive integer/);
  });
});

describe("product snapshots in order items", () => {
  it("stores product name, SKU, and unit price snapshot", () => {
    const product = {
      id: "product-1",
      imageUrls: ["https://example.com/pendant.jpg"],
      name: "Підвіска",
      sku: "PENDANT-1",
      unitPriceMinor: 800_00,
    };

    const item = createOrderItemFromProductSnapshot(product, 2);

    product.name = "Нова назва";
    product.sku = "NEW-SKU";
    product.unitPriceMinor = 1;
    product.imageUrls = ["https://example.com/changed.jpg"];

    expect(item).toMatchObject({
      lineTotalMinor: 1_600_00,
      productId: "product-1",
      productImageUrlsSnapshot: ["https://example.com/pendant.jpg"],
      productNameSnapshot: "Підвіска",
      productSkuSnapshot: "PENDANT-1",
      quantity: 2,
      unitPriceMinor: 800_00,
    });
  });

  it("rejects invalid unit prices", () => {
    expect(() =>
      createOrderItemFromProductSnapshot(
        {
          id: "product-1",
          name: "Каблучка",
          sku: "RING-1",
          unitPriceMinor: -1,
        },
        1,
      ),
    ).toThrow(/Unit price/);
  });
});

describe("order status transitions", () => {
  it("allows expected order progress", () => {
    expect(isOrderStatus("DRAFT")).toBe(true);
    expect(
      canTransitionOrderStatus("DRAFT", "SENT_TO_CUSTOMER"),
    ).toBe(true);
    expect(canTransitionOrderStatus("PAYMENT_PENDING", "PAID")).toBe(true);
    expect(canTransitionOrderStatus("DELIVERED", "COMPLETED")).toBe(true);
  });

  it("allows idempotent status updates", () => {
    expect(canTransitionOrderStatus("PAID", "PAID")).toBe(true);
  });

  it("rejects invalid order progress", () => {
    expect(isOrderStatus("UNKNOWN")).toBe(false);
    expect(canTransitionOrderStatus("DRAFT", "PAID")).toBe(false);
    expect(() => assertOrderStatusTransition("COMPLETED", "PAID")).toThrow(
      /Invalid order status transition/,
    );
  });
});
