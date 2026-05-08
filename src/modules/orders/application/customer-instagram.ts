const instagramUsernamePattern =
  /^(?!.*\.\.)(?!\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/;

export function normalizeInstagramUsername(value: string | null | undefined):
  | {
      ok: true;
      value: string | null;
    }
  | {
      ok: false;
    } {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return {
      ok: true,
      value: null,
    };
  }

  if (/\s/.test(trimmed)) {
    return {
      ok: false,
    };
  }

  const withoutLeadingAt = trimmed.replace(/^@+/, "");

  if (!instagramUsernamePattern.test(withoutLeadingAt)) {
    return {
      ok: false,
    };
  }

  return {
    ok: true,
    value: withoutLeadingAt,
  };
}

export function formatInstagramUsername(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeInstagramUsername(value);

  if (!normalized.ok || !normalized.value) {
    return null;
  }

  return `@${normalized.value}`;
}
