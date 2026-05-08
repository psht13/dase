import { formatOrderDisplayNumber } from "@/modules/orders/application/order-display-number";

describe("formatOrderDisplayNumber", () => {
  it("uses the first eight characters of the order id", () => {
    expect(
      formatOrderDisplayNumber("55e143f7-1f01-4bd9-9bcb-4c7417db75bb"),
    ).toBe("#55e143f7");
  });

  it("keeps short non-UUID ids stable for tests and fixtures", () => {
    expect(formatOrderDisplayNumber("order-1")).toBe("#order-1");
  });
});
