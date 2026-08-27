import { verifyWebhookSignature as verifyInternal } from './signing';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { verifyWebhookSignature: verifyDocumented, DEFAULT_TOLERANCE_SECONDS } = require('../../../docs/examples/verify-webhook-signature');

const SECRET = 'rfs_test_secret';
const TIMESTAMP = '1786977000';
const BODY = '{"id":"evt_123","event":"order.completed"}';
const SIGNATURE = 'v1=85bb180981a087b251905962df9f4cfcd693b322c9b0413b03f97e3692ba11d7';
const NOW = Number(TIMESTAMP);

describe('documentation webhook-signature verifier', () => {
  it('matches the internal verifier on the shared fixed vector', () => {
    expect(
      verifyInternal(SECRET, TIMESTAMP, BODY, SIGNATURE),
    ).toBe(true);
    expect(
      verifyDocumented({
        secret: SECRET,
        timestampHeader: TIMESTAMP,
        signatureHeader: SIGNATURE,
        rawBody: BODY,
        now: NOW,
      }),
    ).toEqual({ valid: true });
  });

  it('enforces the documented five-minute freshness tolerance', () => {
    expect(DEFAULT_TOLERANCE_SECONDS).toBe(5 * 60);
    expect(
      verifyDocumented({
        secret: SECRET,
        timestampHeader: TIMESTAMP,
        signatureHeader: SIGNATURE,
        rawBody: BODY,
        now: NOW + DEFAULT_TOLERANCE_SECONDS,
      }),
    ).toEqual({ valid: true });
    expect(
      verifyDocumented({
        secret: SECRET,
        timestampHeader: TIMESTAMP,
        signatureHeader: SIGNATURE,
        rawBody: BODY,
        now: NOW + DEFAULT_TOLERANCE_SECONDS + 1,
      }),
    ).toEqual({ valid: false, reason: 'stale_timestamp' });
    expect(
      verifyDocumented({
        secret: SECRET,
        timestampHeader: TIMESTAMP,
        signatureHeader: SIGNATURE,
        rawBody: BODY,
        now: NOW - DEFAULT_TOLERANCE_SECONDS - 1,
      }),
    ).toEqual({ valid: false, reason: 'stale_timestamp' });
  });

  it('rejects a wrong secret', () => {
    expect(
      verifyDocumented({
        secret: 'rfs_wrong_secret',
        timestampHeader: TIMESTAMP,
        signatureHeader: SIGNATURE,
        rawBody: BODY,
        now: NOW,
      }),
    ).toEqual({ valid: false, reason: 'signature_mismatch' });
  });

  it('rejects a changed body', () => {
    expect(
      verifyDocumented({
        secret: SECRET,
        timestampHeader: TIMESTAMP,
        signatureHeader: SIGNATURE,
        rawBody: `${BODY} `,
        now: NOW,
      }),
    ).toEqual({ valid: false, reason: 'signature_mismatch' });
  });

  it('rejects a changed timestamp that is still within tolerance', () => {
    const shiftedTimestamp = String(NOW + 1);
    expect(
      verifyDocumented({
        secret: SECRET,
        timestampHeader: shiftedTimestamp,
        signatureHeader: SIGNATURE,
        rawBody: BODY,
        now: Number(shiftedTimestamp),
      }),
    ).toEqual({ valid: false, reason: 'signature_mismatch' });
  });

  it('rejects malformed hex in the signature', () => {
    expect(
      verifyDocumented({
        secret: SECRET,
        timestampHeader: TIMESTAMP,
        signatureHeader: `v1=${'z'.repeat(64)}`,
        rawBody: BODY,
        now: NOW,
      }),
    ).toEqual({ valid: false, reason: 'malformed_signature' });
  });

  it('rejects a digest of the wrong length', () => {
    expect(
      verifyDocumented({
        secret: SECRET,
        timestampHeader: TIMESTAMP,
        signatureHeader: `v1=${'a'.repeat(63)}`,
        rawBody: BODY,
        now: NOW,
      }),
    ).toEqual({ valid: false, reason: 'malformed_signature' });
  });

  it('rejects an unsupported scheme, missing fields, and non-numeric timestamps', () => {
    expect(
      verifyDocumented({
        secret: SECRET,
        timestampHeader: TIMESTAMP,
        signatureHeader: `v2=${'a'.repeat(64)}`,
        rawBody: BODY,
        now: NOW,
      }),
    ).toEqual({ valid: false, reason: 'malformed_signature' });
    expect(
      verifyDocumented({
        secret: '',
        timestampHeader: TIMESTAMP,
        signatureHeader: SIGNATURE,
        rawBody: BODY,
        now: NOW,
      }),
    ).toEqual({ valid: false, reason: 'missing_secret' });
    expect(
      verifyDocumented({
        secret: SECRET,
        timestampHeader: 'not-a-number',
        signatureHeader: SIGNATURE,
        rawBody: BODY,
        now: NOW,
      }),
    ).toEqual({ valid: false, reason: 'malformed_timestamp' });
    expect(
      verifyDocumented({
        secret: SECRET,
        timestampHeader: TIMESTAMP,
        signatureHeader: SIGNATURE,
        rawBody: undefined,
        now: NOW,
      }),
    ).toEqual({ valid: false, reason: 'missing_raw_body' });
  });
});
