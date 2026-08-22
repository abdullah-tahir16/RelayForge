import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookRequest } from './webhook-request.builder';
import { responseHeadersToRecord } from './header-redaction';

export interface WebhookSendResult {
  succeeded: boolean;
  statusCode: number | null;
  responseHeaders: Record<string, string> | null;
  responseBodyPreview: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

@Injectable()
export class WebhookSenderService {
  private readonly responsePreviewMaxBytes: number;

  constructor(configService: ConfigService) {
    this.responsePreviewMaxBytes = configService.get<number>(
      'delivery.responsePreviewMaxBytes',
      4_096,
    );
  }

  async send(request: WebhookRequest): Promise<WebhookSendResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
      });
      const contentType = response.headers.get('content-type') ?? '';
      const responseBodyPreview = isTextualContentType(contentType)
        ? await readBoundedText(response, this.responsePreviewMaxBytes)
        : null;
      return {
        succeeded: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        responseHeaders: responseHeadersToRecord(response.headers),
        responseBodyPreview,
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      const normalized = normalizeTransportError(error);
      return {
        succeeded: false,
        statusCode: null,
        responseHeaders: null,
        responseBodyPreview: null,
        ...normalized,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isTextualContentType(contentType: string): boolean {
  if (!contentType) return true;
  const normalized = contentType.toLowerCase();
  return (
    normalized.startsWith('text/') ||
    normalized.includes('json') ||
    normalized.includes('xml') ||
    normalized.includes('x-www-form-urlencoded')
  );
}

export async function readBoundedText(
  response: Response,
  maxBytes: number,
): Promise<string | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxBytes - total;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      total += chunk.byteLength;
      if (value.byteLength > remaining) {
        await reader.cancel();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(combined);
}

export function normalizeTransportError(error: unknown): {
  errorCode: string;
  errorMessage: string;
} {
  const candidate = error as { name?: string; cause?: { code?: string } };
  if (candidate?.name === 'AbortError') {
    return { errorCode: 'TIMEOUT', errorMessage: 'Webhook request timed out' };
  }
  const causeCode = candidate?.cause?.code ?? '';
  if (causeCode === 'ENOTFOUND' || causeCode === 'EAI_AGAIN') {
    return { errorCode: 'DNS_ERROR', errorMessage: 'Webhook hostname could not be resolved' };
  }
  if (causeCode === 'ECONNREFUSED' || causeCode === 'ECONNRESET') {
    return { errorCode: 'CONNECTION_ERROR', errorMessage: 'Webhook connection failed' };
  }
  if (causeCode.includes('CERT') || causeCode.includes('TLS')) {
    return { errorCode: 'TLS_ERROR', errorMessage: 'Webhook TLS negotiation failed' };
  }
  return { errorCode: 'NETWORK_ERROR', errorMessage: 'Webhook request failed' };
}
