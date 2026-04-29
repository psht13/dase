import { randomBytes } from "node:crypto";

const publicTokenPattern = /^[A-Za-z0-9_-]{32,}$/;

export function generatePublicOrderToken(byteLength = 24): string {
  if (!Number.isInteger(byteLength) || byteLength < 24) {
    throw new Error("Public order token must use at least 24 random bytes");
  }

  return randomBytes(byteLength).toString("base64url");
}

export function isValidPublicOrderToken(token: string): boolean {
  return publicTokenPattern.test(token);
}
