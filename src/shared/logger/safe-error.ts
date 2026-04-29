const sensitiveAssignmentPattern =
  /\b([A-Z0-9_]*(?:DATABASE_URL|TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*=)([^\s]+)/gi;
const credentialedUrlPattern = /([a-z][a-z0-9+.-]*:\/\/)([^/\s:@]+):([^/\s@]+)@/gi;

export function formatSafeError(error: unknown): string {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error ?? "Unknown error");

  return redactSensitiveText(message);
}

export function redactSensitiveText(text: string): string {
  return text
    .replace(sensitiveAssignmentPattern, "$1[redacted]")
    .replace(credentialedUrlPattern, "$1[redacted]:[redacted]@");
}
