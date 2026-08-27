import configuration, { parsePositiveInteger, parseRetryDelays } from './configuration';

describe('delivery retry configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DELIVERY_RETRY_DELAYS_MS;
    delete process.env.DELIVERY_MAX_ATTEMPTS;
    delete process.env.DELIVERY_RESPONSE_PREVIEW_MAX_BYTES;
    delete process.env.SIGNING_SECRET_ENCRYPTION_KEY;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the documented defaults', () => {
    expect(configuration().kafka.dlqTopic).toBe('relayforge.dlq');
    expect(configuration().delivery).toMatchObject({
      retryDelaysMs: [30_000, 120_000, 600_000, 3_600_000],
      maxAttempts: 5,
      responsePreviewMaxBytes: 4_096,
    });
  });

  it('parses an accelerated four-stage schedule', () => {
    expect(parseRetryDelays('1,2,3,4')).toEqual([1, 2, 3, 4]);
  });

  it('rejects malformed or non-positive values', () => {
    expect(() => parseRetryDelays('1,2,3')).toThrow();
    expect(() => parseRetryDelays('1,2,0,4')).toThrow();
    expect(() => parsePositiveInteger('-1', 5)).toThrow();
  });

  it('requires a canonical 32-byte signing key in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => configuration()).toThrow(
      'SIGNING_SECRET_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes',
    );
    process.env.SIGNING_SECRET_ENCRYPTION_KEY = 'not-a-key';
    expect(() => configuration()).toThrow(
      'SIGNING_SECRET_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes',
    );
    process.env.SIGNING_SECRET_ENCRYPTION_KEY =
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    expect(configuration().signing.encryptionKey).toEqual(Buffer.alloc(32));
  });
});
