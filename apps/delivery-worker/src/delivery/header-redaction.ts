export const REDACTED_HEADER_VALUE = '[REDACTED]';

export function redactHeaders(
  headers: Record<string, string>,
  sensitiveHeaders: readonly string[],
): Record<string, string> {
  const denied = new Set(sensitiveHeaders.map((header) => header.toLowerCase()));
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      denied.has(name.toLowerCase()) ? REDACTED_HEADER_VALUE : value,
    ]),
  );
}

export function responseHeadersToRecord(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}
