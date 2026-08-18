export function formatPayloadPretty(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2);
}

export function formatPayloadRaw(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
