import { ConfigService } from '@nestjs/config';
import { redactHeaders, REDACTED_HEADER_VALUE } from './header-redaction';
import {
  normalizeTransportError,
  readBoundedText,
  WebhookSenderService,
} from './webhook-sender.service';

describe('webhook diagnostics', () => {
  it('redacts sensitive header names case-insensitively', () => {
    expect(
      redactHeaders(
        {
          Authorization: 'secret',
          COOKIE: 'session',
          'X-RelayForge-Signature': 'v1=secret',
          'X-Safe': 'visible',
        },
        ['authorization', 'cookie', 'x-relayforge-signature'],
      ),
    ).toEqual({
      Authorization: REDACTED_HEADER_VALUE,
      COOKIE: REDACTED_HEADER_VALUE,
      'X-RelayForge-Signature': REDACTED_HEADER_VALUE,
      'X-Safe': 'visible',
    });
  });

  it('reads at most the configured number of UTF-8 bytes', async () => {
    const response = new Response('abcdefgh', {
      headers: { 'content-type': 'text/plain' },
    });
    expect(await readBoundedText(response, 4)).toBe('abcd');
  });

  it('normalizes errors without retaining arbitrary exception messages', () => {
    expect(normalizeTransportError({ name: 'AbortError' })).toEqual({
      errorCode: 'TIMEOUT',
      errorMessage: 'Webhook request timed out',
    });
    expect(
      normalizeTransportError({
        message: 'https://user:password@secret.example',
        cause: { code: 'ENOTFOUND' },
      }),
    ).toEqual({
      errorCode: 'DNS_ERROR',
      errorMessage: 'Webhook hostname could not be resolved',
    });
  });

  it('does not preview a known binary response', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue(
      new Response(new Uint8Array([0, 1, 2]), {
        status: 500,
        headers: { 'content-type': 'application/octet-stream' },
      }),
    );
    try {
      const sender = new WebhookSenderService(
        new ConfigService({ delivery: { responsePreviewMaxBytes: 4 } }),
      );
      const result = await sender.send({
        url: 'https://example.com',
        headers: {},
        body: '{}',
        timeoutMs: 100,
      });
      expect(result.responseBodyPreview).toBeNull();
      expect(result.statusCode).toBe(500);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
