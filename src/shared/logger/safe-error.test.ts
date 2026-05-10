import { formatSafeError, redactSensitiveText } from "./safe-error";

describe("safe error formatting", () => {
  it("redacts credentialed URLs and sensitive assignments", () => {
    expect(
      redactSensitiveText(
        "DATABASE_URL=https://user:password@example.com/dase APP_ENCRYPTION_KEY=secret",
      ),
    ).toBe(
      "DATABASE_URL=[redacted] APP_ENCRYPTION_KEY=[redacted]",
    );
    expect(
      redactSensitiveText("connect https://user:password@example.com/dase"),
    ).toBe("connect https://[redacted]:[redacted]@example.com/dase");
  });

  it("formats unknown errors without leaking credential values", () => {
    expect(
      formatSafeError(
        new Error(
          "failed with OWNER_SETUP_TOKEN=secret and https://u:p@example.com",
        ),
      ),
    ).toBe(
      "Error: failed with OWNER_SETUP_TOKEN=[redacted] and https://[redacted]:[redacted]@example.com",
    );
  });
});
