import { ShippingCarrierApiError } from "@/modules/shipping/infrastructure/shipping-carrier-api-error";

type NovaPostJwtProviderOptions = {
  apiKey: string;
  authUrl?: string;
  baseUrl?: string;
  cacheTtlMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  refreshSkewMs?: number;
};

type CachedJwt = {
  expiresAtMs: number;
  token: string;
};

type NovaPostAuthorizationResponse = {
  jwt?: unknown;
};

export const defaultNovaPostApiUrl = "https://api.novapost.com/v.1.0/";
export const defaultNovaPostStageApiUrl = "https://api-stage.novapost.pl/v.1.0/";

const defaultCacheTtlMs = 55 * 60 * 1_000;
const defaultRefreshSkewMs = 5 * 60 * 1_000;

export class NovaPostJwtProvider {
  private cachedJwt: CachedJwt | null = null;
  private readonly apiKey: string;
  private readonly authUrl: string;
  private readonly cacheTtlMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly refreshSkewMs: number;

  constructor(options: NovaPostJwtProviderOptions) {
    this.apiKey = options.apiKey;
    this.authUrl =
      options.authUrl ?? deriveNovaPostAuthorizationUrl(options.baseUrl);
    this.cacheTtlMs = Math.min(
      options.cacheTtlMs ?? defaultCacheTtlMs,
      defaultCacheTtlMs,
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.refreshSkewMs = options.refreshSkewMs ?? defaultRefreshSkewMs;
  }

  async getToken(): Promise<string> {
    const nowMs = this.now().getTime();

    if (
      this.cachedJwt &&
      this.cachedJwt.expiresAtMs - this.refreshSkewMs > nowMs
    ) {
      return this.cachedJwt.token;
    }

    const token = await this.fetchToken();
    const tokenExpiresAtMs = parseJwtExpirationMs(token);
    const fallbackExpiresAtMs = nowMs + this.cacheTtlMs;
    const expiresAtMs =
      tokenExpiresAtMs && tokenExpiresAtMs > nowMs
        ? Math.min(tokenExpiresAtMs, fallbackExpiresAtMs)
        : fallbackExpiresAtMs;

    this.cachedJwt = {
      expiresAtMs,
      token,
    };

    return token;
  }

  private async fetchToken(): Promise<string> {
    const url = new URL(this.authUrl);
    url.searchParams.set("apiKey", this.apiKey);

    const response = await this.fetchImpl(url, {
      headers: {
        accept: "application/json",
      },
      method: "GET",
    });

    if (!response.ok) {
      throw new ShippingCarrierApiError(
        `Nova Post authorization failed with ${response.status}`,
      );
    }

    const body = (await response.json()) as NovaPostAuthorizationResponse;
    const token = typeof body.jwt === "string" ? body.jwt.trim() : "";

    if (!token) {
      throw new ShippingCarrierApiError("Nova Post authorization response is invalid");
    }

    return token;
  }
}

export function deriveNovaPostAuthorizationUrl(baseUrl?: string): string {
  return new URL("clients/authorization", normalizeNovaPostBaseUrl(baseUrl))
    .toString();
}

export function normalizeNovaPostBaseUrl(baseUrl?: string): string {
  const value = baseUrl?.trim() || defaultNovaPostApiUrl;

  return value.endsWith("/") ? value : `${value}/`;
}

function parseJwtExpirationMs(token: string): number | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };

    return typeof parsed.exp === "number" ? parsed.exp * 1_000 : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64").toString("utf8");
}
