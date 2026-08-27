import {
  decryptSigningSecret,
  encryptSigningSecret,
  generateSigningSecret,
  hashSigningSecret,
  parseSigningEncryptionKey,
  signWebhook,
  verifyWebhookSignature,
  webhookSignedInput,
} from './signing';

const KEY_BASE64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const KEY = Buffer.alloc(32);

describe('webhook signing primitives', () => {
  it('generates prefixed 256-bit secrets with unique hashes', () => {
    const generated = Array.from({ length: 256 }, () => generateSigningSecret());
    expect(new Set(generated.map(({ secret }) => secret)).size).toBe(256);
    expect(new Set(generated.map(({ hash }) => hash)).size).toBe(256);
    for (const { secret, hash } of generated) {
      expect(secret).toMatch(/^rfs_[A-Za-z0-9_-]{43}$/);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).toBe(hashSigningSecret(secret));
    }
  });

  it('strictly parses canonical 32-byte base64 keys without echoing input', () => {
    expect(parseSigningEncryptionKey(KEY_BASE64)).toEqual(KEY);
    for (const invalid of [undefined, '', 'not-base64', KEY_BASE64.slice(0, -1), `${KEY_BASE64}\n`]) {
      expect(() => parseSigningEncryptionKey(invalid)).toThrow(
        'SIGNING_SECRET_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes',
      );
    }
  });

  it('round-trips authenticated envelopes with a fresh nonce', () => {
    const secret = generateSigningSecret().secret;
    const first = encryptSigningSecret(secret, KEY);
    const second = encryptSigningSecret(secret, KEY);
    expect(first).not.toBe(second);
    expect(first).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(decryptSigningSecret(first, KEY)).toBe(secret);
    expect(decryptSigningSecret(second, KEY)).toBe(secret);
  });

  it('rejects malformed, tampered, and wrong-key envelopes', () => {
    const envelope = encryptSigningSecret('rfs_test', KEY);
    const tampered = `${envelope.slice(0, -1)}${envelope.endsWith('A') ? 'B' : 'A'}`;
    for (const value of ['', 'v2.a.b.c', 'v1.a.b', tampered]) {
      expect(() => decryptSigningSecret(value, KEY)).toThrow(
        'Signing-secret envelope could not be authenticated',
      );
    }
    expect(() => decryptSigningSecret(envelope, Buffer.alloc(32, 1))).toThrow(
      'Signing-secret envelope could not be authenticated',
    );
  });

  it('uses the documented timestamp dot raw-body HMAC vector', () => {
    const secret = 'rfs_test_secret';
    const timestamp = '1786977000';
    const body = '{"id":"evt_123","event":"order.completed"}';
    expect(webhookSignedInput(timestamp, body)).toBe(`${timestamp}.${body}`);
    expect(signWebhook(secret, timestamp, body)).toBe(
      'v1=85bb180981a087b251905962df9f4cfcd693b322c9b0413b03f97e3692ba11d7',
    );
    const signature = signWebhook(secret, timestamp, body);
    expect(verifyWebhookSignature(secret, timestamp, body, signature)).toBe(true);
    expect(verifyWebhookSignature('wrong', timestamp, body, signature)).toBe(false);
    expect(verifyWebhookSignature(secret, `${Number(timestamp) + 1}`, body, signature)).toBe(false);
    expect(verifyWebhookSignature(secret, timestamp, `${body} `, signature)).toBe(false);
    expect(verifyWebhookSignature(secret, timestamp, body, 'v1=abc')).toBe(false);
    expect(verifyWebhookSignature(secret, timestamp, body, `v2=${'0'.repeat(64)}`)).toBe(false);
  });
});
