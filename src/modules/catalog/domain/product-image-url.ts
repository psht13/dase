const allowedImageProtocols = new Set(["http:", "https:"]);

export function parseProductImageUrl(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error("Product image URL is required");
  }

  let url: URL;

  try {
    url = new URL(trimmedValue);
  } catch {
    throw new Error("Product image URL must be a valid URL");
  }

  if (!allowedImageProtocols.has(url.protocol)) {
    throw new Error("Product image URL must use HTTP or HTTPS");
  }

  return url.toString();
}

export function parseProductImageUrls(values: readonly string[]): string[] {
  return values.map(parseProductImageUrl);
}
