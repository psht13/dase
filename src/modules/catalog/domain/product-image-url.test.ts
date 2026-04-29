import {
  parseProductImageUrl,
  parseProductImageUrls,
} from "./product-image-url";

describe("product image URLs", () => {
  it("accepts HTTP and HTTPS image URLs", () => {
    expect(parseProductImageUrl("https://example.com/ring.jpg")).toBe(
      "https://example.com/ring.jpg",
    );
    expect(parseProductImageUrl(" http://example.com/bracelet.png ")).toBe(
      "http://example.com/bracelet.png",
    );
  });

  it("validates multiple image URLs", () => {
    expect(
      parseProductImageUrls([
        "https://example.com/one.jpg",
        "https://example.com/two.webp",
      ]),
    ).toEqual([
      "https://example.com/one.jpg",
      "https://example.com/two.webp",
    ]);
  });

  it("rejects invalid or unsafe image URLs", () => {
    expect(() => parseProductImageUrl("")).toThrow(/required/);
    expect(() => parseProductImageUrl("not-a-url")).toThrow(/valid URL/);
    expect(() => parseProductImageUrl("data:image/png;base64,abc")).toThrow(
      /HTTP or HTTPS/,
    );
  });
});
