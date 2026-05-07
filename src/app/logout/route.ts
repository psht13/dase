import { NextResponse } from "next/server";
import { getAuth } from "@/modules/users/infrastructure/auth";
import { getWebEnv } from "@/shared/config/env";

export async function GET(request: Request) {
  const signOutResponse = await getAuth().api.signOut({
    asResponse: true,
    headers: request.headers,
  });
  const response = NextResponse.redirect(getLogoutRedirectUrl(request));

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

function getLogoutRedirectUrl(request: Request): URL {
  const env = getWebEnv();
  const baseUrl = env.BETTER_AUTH_URL ?? getRequestBaseUrl(request);

  return new URL("/login?logout=1", baseUrl);
}

function getRequestBaseUrl(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (!host) {
    return request.url;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProto ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return `${protocol}://${host}`;
}
