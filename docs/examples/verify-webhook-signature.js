#!/usr/bin/env node
'use strict';

/**
 * Reference verifier for RelayForge webhook signatures.
 *
 * Zero dependencies — uses only Node's built-in `crypto` module, so it can be
 * copied directly into any Node.js receiver. See ../webhook-signatures.md for
 * the full wire format this implements.
 *
 * Usage as a module:
 *
 *   const { verifyWebhookSignature } = require('./verify-webhook-signature');
 *   const result = verifyWebhookSignature({
 *     secret: endpointSigningSecret,       // the endpoint's current signing secret
 *     timestampHeader: req.headers['x-relayforge-timestamp'],
 *     signatureHeader: req.headers['x-relayforge-signature'],
 *     rawBody: rawRequestBodyString,       // the exact bytes RelayForge sent — see the doc's raw-body warning
 *   });
 *   if (!result.valid) {
 *     res.status(401).send(`invalid signature: ${result.reason}`);
 *     return;
 *   }
 *
 * Run directly (`node verify-webhook-signature.js`) to see it validate the
 * fixed vector documented in webhook-signatures.md.
 */

const crypto = require('crypto');

const SIGNATURE_VERSION = 'v1';
const HEX_SHA256 = /^[a-f0-9]{64}$/;
const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

/**
 * @param {object} options
 * @param {string} options.secret - The endpoint's current signing secret (starts with `rfs_`).
 * @param {string} options.timestampHeader - The raw `X-RelayForge-Timestamp` header value.
 * @param {string} options.signatureHeader - The raw `X-RelayForge-Signature` header value.
 * @param {string} options.rawBody - The exact, unmodified request body bytes as a UTF-8 string.
 * @param {number} [options.toleranceSeconds] - Maximum allowed age of the timestamp, in seconds.
 * @param {number} [options.now] - Current Unix time in whole seconds (override for testing).
 * @returns {{ valid: true } | { valid: false, reason: string }}
 */
function verifyWebhookSignature(options) {
  const {
    secret,
    timestampHeader,
    signatureHeader,
    rawBody,
    toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
    now = Math.floor(Date.now() / 1000),
  } = options || {};

  if (typeof secret !== 'string' || secret.length === 0) {
    return { valid: false, reason: 'missing_secret' };
  }
  if (typeof rawBody !== 'string') {
    return { valid: false, reason: 'missing_raw_body' };
  }
  if (typeof timestampHeader !== 'string' || !/^\d+$/.test(timestampHeader)) {
    return { valid: false, reason: 'malformed_timestamp' };
  }
  if (Math.abs(now - Number(timestampHeader)) > toleranceSeconds) {
    return { valid: false, reason: 'stale_timestamp' };
  }
  if (typeof signatureHeader !== 'string') {
    return { valid: false, reason: 'malformed_signature' };
  }

  const [version, digestHex, extra] = signatureHeader.split('=');
  if (
    version !== SIGNATURE_VERSION ||
    extra !== undefined ||
    !HEX_SHA256.test(digestHex || '')
  ) {
    return { valid: false, reason: 'malformed_signature' };
  }

  const signedInput = `${timestampHeader}.${rawBody}`;
  const expectedDigest = crypto
    .createHmac('sha256', secret)
    .update(signedInput, 'utf8')
    .digest('hex');

  const received = Buffer.from(digestHex, 'hex');
  const expected = Buffer.from(expectedDigest, 'hex');
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return { valid: false, reason: 'signature_mismatch' };
  }

  return { valid: true };
}

module.exports = { verifyWebhookSignature, DEFAULT_TOLERANCE_SECONDS };

if (require.main === module) {
  const secret = 'rfs_test_secret';
  const timestampHeader = '1786977000';
  const rawBody = '{"id":"evt_123","event":"order.completed"}';
  const signatureHeader =
    'v1=85bb180981a087b251905962df9f4cfcd693b322c9b0413b03f97e3692ba11d7';

  const result = verifyWebhookSignature({
    secret,
    timestampHeader,
    signatureHeader,
    rawBody,
    now: Number(timestampHeader),
  });

  console.log('Verifying the documented fixed vector from webhook-signatures.md...');
  console.log(result);
  process.exit(result.valid ? 0 : 1);
}
