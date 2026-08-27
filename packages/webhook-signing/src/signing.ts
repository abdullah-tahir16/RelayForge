import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

const SECRET_PREFIX = 'rfs_';
const SECRET_RANDOM_BYTES = 32;
const ENCRYPTION_KEY_BYTES = 32;
const GCM_NONCE_BYTES = 12;
const GCM_TAG_BYTES = 16;
const ENVELOPE_VERSION = 'v1';
const SIGNATURE_VERSION = 'v1';
const HEX_SHA256 = /^[a-f0-9]{64}$/;
const CANONICAL_BASE64_32_BYTES = /^[A-Za-z0-9+/]{43}=$/;
const CANONICAL_BASE64URL = /^[A-Za-z0-9_-]+$/;

export interface GeneratedSigningSecret {
  secret: string;
  hash: string;
}

export function generateSigningSecret(): GeneratedSigningSecret {
  const secret = `${SECRET_PREFIX}${randomBytes(SECRET_RANDOM_BYTES).toString('base64url')}`;
  return { secret, hash: hashSigningSecret(secret) };
}

export function hashSigningSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function parseSigningEncryptionKey(value: string | undefined): Buffer {
  if (!value || !CANONICAL_BASE64_32_BYTES.test(value)) {
    throw new Error(
      'SIGNING_SECRET_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes',
    );
  }
  const key = Buffer.from(value, 'base64');
  if (
    key.length !== ENCRYPTION_KEY_BYTES ||
    key.toString('base64') !== value
  ) {
    throw new Error(
      'SIGNING_SECRET_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes',
    );
  }
  return key;
}

export function encryptSigningSecret(secret: string, key: Buffer): string {
  assertEncryptionKey(key);
  const nonce = randomBytes(GCM_NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    ENVELOPE_VERSION,
    nonce.toString('base64url'),
    ciphertext.toString('base64url'),
    tag.toString('base64url'),
  ].join('.');
}

export function decryptSigningSecret(envelope: string, key: Buffer): string {
  assertEncryptionKey(key);
  const [version, noncePart, ciphertextPart, tagPart, extra] = envelope.split('.');
  if (
    version !== ENVELOPE_VERSION ||
    extra !== undefined ||
    !isCanonicalBase64Url(noncePart) ||
    !isCanonicalBase64Url(ciphertextPart) ||
    !isCanonicalBase64Url(tagPart)
  ) {
    throw invalidEnvelope();
  }

  const nonce = Buffer.from(noncePart, 'base64url');
  const ciphertext = Buffer.from(ciphertextPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  if (
    nonce.length !== GCM_NONCE_BYTES ||
    ciphertext.length === 0 ||
    tag.length !== GCM_TAG_BYTES
  ) {
    throw invalidEnvelope();
  }

  try {
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw invalidEnvelope();
  }
}

export function webhookSignedInput(timestamp: string, rawBody: string): string {
  return `${timestamp}.${rawBody}`;
}

export function signWebhook(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  const digest = createHmac('sha256', secret)
    .update(webhookSignedInput(timestamp, rawBody), 'utf8')
    .digest('hex');
  return `${SIGNATURE_VERSION}=${digest}`;
}

export function verifyWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  const [version, digest, extra] = signature.split('=');
  if (
    version !== SIGNATURE_VERSION ||
    extra !== undefined ||
    !HEX_SHA256.test(digest ?? '')
  ) {
    return false;
  }
  const expected = Buffer.from(
    signWebhook(secret, timestamp, rawBody).slice(SIGNATURE_VERSION.length + 1),
    'hex',
  );
  const received = Buffer.from(digest, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function assertEncryptionKey(key: Buffer): void {
  if (key.length !== ENCRYPTION_KEY_BYTES) {
    throw new Error('Signing-secret encryption key must contain exactly 32 bytes');
  }
}

function isCanonicalBase64Url(value: string | undefined): value is string {
  if (!value || !CANONICAL_BASE64URL.test(value)) return false;
  return Buffer.from(value, 'base64url').toString('base64url') === value;
}

function invalidEnvelope(): Error {
  return new Error('Signing-secret envelope could not be authenticated');
}
