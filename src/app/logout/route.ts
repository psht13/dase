import { NextResponse } from "next/server";
import { getAuth } from "@/modules/users/infrastructure/auth";

export async function GET(request: Request) {
  const signOutResponse = await getAuth().api.signOut({
    asResponse: true,
    headers: request.headers,
  });
  const response = NextResponse.redirect(new URL("/login?logout=1", request.url));

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
