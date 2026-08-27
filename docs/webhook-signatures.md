# Verifying RelayForge webhook signatures

Every webhook RelayForge sends from a signing-capable delivery includes an HMAC-SHA256 signature so your endpoint can confirm the request came from RelayForge and that its body was not altered in transit. This document describes the wire format and links a runnable Node.js verifier.

## Headers

| Header | Description |
| --- | --- |
| `X-RelayForge-Event` | The event type, e.g. `order.completed`. |
| `X-RelayForge-Event-Id` | The RelayForge event ID. |
| `X-RelayForge-Delivery-Id` | The logical delivery ID (stable across retries of the same delivery). |
| `X-RelayForge-Timestamp` | Unix time, in whole seconds, captured when the request was built. Part of the signed input — see below. |
| `X-RelayForge-Signature` | `v1=<64-character lowercase hex digest>`. `v1` names the signing scheme, not the endpoint's secret version. |

`X-RelayForge-Signature` is present only on deliveries created after your endpoint had a signing secret. Deliveries retained from before this feature shipped, or endpoints that have not yet had their (migration-issued) secret rotated to a known value, are sent unsigned — treat the absence of the header as "not yet signing-capable," not as an error.

## Canonicalization: `timestamp.raw-body`

The signed input is the exact byte sequence:

```text
<timestamp>.<raw-request-body>
```

- `<timestamp>` is the literal value of `X-RelayForge-Timestamp` — the same string, not a reparsed number.
- `<raw-request-body>` is the exact bytes RelayForge transmitted, concatenated with the timestamp using a single `.` — nothing is re-serialized.
- The digest is `HMAC-SHA256(secret, timestamp + "." + rawBody)`, hex-encoded in lowercase.

**Read the raw body before any JSON parsing.** If your framework's body parser has already parsed and re-serialized the request body (common with Express's `express.json()`, or any middleware that reformats whitespace, reorders keys, or changes number formatting) by the time you compute the signature, your digest will not match — even though the payload is semantically identical. Capture the raw bytes explicitly (e.g. Express's `express.raw({ type: 'application/json' })`, or reading the body before installing a JSON-parsing middleware) and verify against those raw bytes, not `JSON.stringify(req.body)`.

## Rotation and per-run snapshot semantics

Each delivery run signs with one secret for its entire lifetime, chosen when the run is created:

- An **initial** delivery run snapshots the endpoint's signing secret current at creation time.
- Every **retry** of that run (RelayForge retries failed attempts up to four times over 30s/2m/10m/1h) reuses that same snapshot, even if you rotate the endpoint's secret in between. This means retries for one run stay verifiable with one secret — you don't need to track secret history mid-run.
- A **replay** (whether of a single delivery or of a whole event) starts a new run and snapshots whatever secret is current at that moment. If you rotated since the original run, the replay signs with the new secret.

Practical implication: right after rotating a secret, keep accepting the *previous* secret for a while if you have deliveries that might still be retrying under it, or replay affected deliveries once you're ready to require the new secret exclusively. RelayForge does not send two signatures or overlap secrets within a single request — each request is signed with exactly one secret.

## At-least-once resends

RelayForge delivery is at-least-once, not exactly-once: if a worker crashes after your endpoint accepts a request but before RelayForge records the outcome, the same logical attempt can be sent again once its processing lease expires. Each actual send captures a fresh timestamp and computes a fresh signature at send time — so a resend of "the same" attempt will have a different timestamp and signature than the original, even though it's logically a duplicate. Deduplicate on `X-RelayForge-Event-Id` (and your own idempotency key, if you have one) rather than assuming one event maps to exactly one request.

## Reference verifier

[`docs/examples/verify-webhook-signature.js`](examples/verify-webhook-signature.js) is a dependency-free, runnable Node.js implementation. It:

- Validates the `v1=` scheme and rejects anything else.
- Enforces a five-minute freshness tolerance on `X-RelayForge-Timestamp` by default (configurable via `toleranceSeconds`), rejecting requests outside that window before doing any signature comparison.
- Rejects malformed headers (missing timestamp, non-numeric timestamp, malformed signature, wrong-length digest) without throwing.
- Compares the digest using `crypto.timingSafeEqual` only after confirming both buffers are equal length, to avoid a timing side-channel and avoid `timingSafeEqual` throwing on a length mismatch.

Run it directly to see it validate the fixed vector used throughout this document and the RelayForge test suite:

```bash
node docs/examples/verify-webhook-signature.js
```

```text
Verifying the documented fixed vector from webhook-signatures.md...
{ valid: true }
```

### Fixed vector

This is the same vector `packages/webhook-signing`'s tests and the reference verifier's tests assert against, so you can use it to sanity-check your own implementation in another language:

| Field | Value |
| --- | --- |
| Secret | `rfs_test_secret` |
| Timestamp | `1786977000` |
| Raw body | `{"id":"evt_123","event":"order.completed"}` |
| Signature | `v1=85bb180981a087b251905962df9f4cfcd693b322c9b0413b03f97e3692ba11d7` |

### Usage in an HTTP handler

```js
const { verifyWebhookSignature } = require('./verify-webhook-signature');

app.post('/webhooks/relayforge', express.raw({ type: 'application/json' }), (req, res) => {
  const result = verifyWebhookSignature({
    secret: process.env.RELAYFORGE_SIGNING_SECRET,
    timestampHeader: req.headers['x-relayforge-timestamp'],
    signatureHeader: req.headers['x-relayforge-signature'],
    rawBody: req.body.toString('utf8'),
  });

  if (!result.valid) {
    res.status(401).send(`invalid signature: ${result.reason}`);
    return;
  }

  const event = JSON.parse(req.body.toString('utf8'));
  // ... handle event ...
  res.status(200).end();
});
```
