import {
  formatInstagramUsername,
  normalizeInstagramUsername,
} from "@/modules/orders/application/customer-instagram";

describe("customer Instagram username", () => {
  it("normalizes optional customer Instagram usernames", () => {
    expect(normalizeInstagramUsername("")).toEqual({
      ok: true,
      value: null,
    });
    expect(normalizeInstagramUsername(" @@olena.shop_123 ")).toEqual({
      ok: true,
      value: "olena.shop_123",
    });
  });

  it("formats valid usernames with one leading @ for UI", () => {
    expect(formatInstagramUsername("olena.shop")).toBe("@olena.shop");
    expect(formatInstagramUsername("@@olena.shop")).toBe("@olena.shop");
    expect(formatInstagramUsername("invalid username")).toBeNull();
  });
});
