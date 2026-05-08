import { formatMoneyMinor } from "./format-money";

describe("formatMoneyMinor", () => {
  it("formats UAH with a deterministic hryvnia symbol", () => {
    expect(formatMoneyMinor(210000, "UAH")).toBe("2 100,00 ₴");
  });

  it("falls back to the currency code for unsupported display symbols", () => {
    expect(formatMoneyMinor(210000, "USD")).toBe("2 100,00 USD");
  });
});
