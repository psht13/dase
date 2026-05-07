import { NextResponse } from "next/server";
import { getAuth } from "@/modules/users/infrastructure/auth";
import {
  getWebEnv,
  isInternalRailwayUrl,
  isLocalhostUrl,
  type WebEnv,
} from "@/shared/config/env";

export async function GET(request: Request) {
  return signOutAndRedirect(request);
}

export async function POST(request: Request) {
  return signOutAndRedirect(request);
}

async function signOutAndRedirect(request: Request) {
  const redirectUrl = getLogoutRedirectUrl(request);
  const signOutResponse = await getAuth().api.signOut({
    asResponse: true,
    headers: request.headers,
  });
  const response = NextResponse.redirect(redirectUrl);

  for (const cookie of getSetCookieHeaders(signOutResponse.headers)) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

function getSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = withGetSetCookie.getSetCookie?.();

  if (cookies?.length) {
    return cookies;
  }

  const cookie = headers.get("set-cookie");

  return cookie ? [cookie] : [];
}

function getLogoutRedirectUrl(
  request: Request,
  env: WebEnv = getWebEnv(),
): URL {
  return new URL("/login?logout=1", resolveLogoutOrigin(request, env));
}

function resolveLogoutOrigin(request: Request, env: WebEnv): string {
  const configuredOrigin = getConfiguredPublicOrigin(env);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const forwardedOrigin = getForwardedOrigin(request);

  if (
    forwardedOrigin &&
    (env.NODE_ENV !== "production" || isPublicProductionOrigin(forwardedOrigin))
  ) {
    return forwardedOrigin;
  }

  if (env.NODE_ENV !== "production") {
    return new URL(request.url).origin;
  }

  throw new Error(
    "Invalid environment configuration: public logout origin could not be resolved",
  );
}

function getConfiguredPublicOrigin(env: WebEnv): string | null {
  if (!env.BETTER_AUTH_URL) {
    return null;
  }

  const origin = new URL(env.BETTER_AUTH_URL).origin;

  if (env.NODE_ENV === "production" && !isPublicProductionOrigin(origin)) {
    return null;
  }

  return origin;
}

function getForwardedOrigin(request: Request): string | null {
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (!forwardedHost) {
    return null;
  }

  const protocol = request.headers.get("x-forwarded-proto") ?? "https";
  const forwardedHostname = forwardedHost.split(",")[0]?.trim();

  if (!forwardedHostname) {
    return null;
  }

  return `${protocol.split(",")[0]?.trim() || "https"}://${forwardedHostname}`;
}

function isPublicProductionOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    return (
      url.protocol === "https:" &&
      !isLocalhostUrl(origin) &&
      !isInternalRailwayUrl(origin)
    );
  } catch {
    return false;
  }
}
