import {
  generatePublicOrderToken,
  isValidPublicOrderToken,
} from "./public-order-token";

describe("public order tokens", () => {
  it("generates random URL-safe tokens", () => {
    const token = generatePublicOrderToken();

    expect(isValidPublicOrderToken(token)).toBe(true);
    expect(token).not.toBe(generatePublicOrderToken());
  });

  it("rejects too little entropy", () => {
    expect(() => generatePublicOrderToken(8)).toThrow(/at least 24/);
  });
});
