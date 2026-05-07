import { formatSafeError, redactSensitiveText } from "./safe-error";

describe("safe error formatting", () => {
  it("redacts credentialed URLs and sensitive assignments", () => {
    expect(
      redactSensitiveText(
        "DATABASE_URL=https://user:password@example.com/dase MONOBANK_TOKEN=token",
      ),
    ).toBe(
      "DATABASE_URL=[redacted] MONOBANK_TOKEN=[redacted]",
    );
    expect(
      redactSensitiveText("connect https://user:password@example.com/dase"),
    ).toBe("connect https://[redacted]:[redacted]@example.com/dase");
  });

  it("formats unknown errors without leaking credential values", () => {
    expect(
      formatSafeError(
        new Error(
          "failed with NOVA_POST_API_KEY=secret and https://u:p@example.com",
        ),
      ),
    ).toBe(
      "Error: failed with NOVA_POST_API_KEY=[redacted] and https://[redacted]:[redacted]@example.com",
    );
  });
});
