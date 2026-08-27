## Why

Webhook deliveries are currently unsigned, so destination systems cannot prove that a request came from RelayForge or detect payload tampering. Endpoint-scoped HMAC secrets and a safe rotation workflow close that trust gap while preserving the existing at-least-once delivery and retry model.

## What Changes

- Generate a high-entropy signing secret for every new endpoint, encrypt it at rest, retain only a non-secret fingerprint/hash alongside the ciphertext, and never expose either stored representation through normal endpoint reads.
- Backfill signing secrets for existing endpoints so newly created delivery runs can be signed after deployment.
- Add a workspace-scoped endpoint action that immediately rotates the signing secret and returns the new plaintext secret once; prior secrets stop signing newly created delivery runs.
- Add a signing-secret section to endpoint detail so users can rotate and copy a newly issued secret while receiving clear one-time-display guidance.
- Version the delivery-job contract so new initial and replay runs carry an encrypted snapshot of the endpoint's current signing secret, while retained older jobs remain consumable.
- Sign every attempt from a signing-capable job with HMAC-SHA256 over the exact `timestamp.rawPayload` bytes and send `X-RelayForge-Signature: v1=<hex-digest>` alongside the existing timestamp header.
- Preserve the snapshotted secret across retries in the same run, redact signature headers from stored attempt diagnostics, and document Node.js verification with timestamp freshness and constant-time comparison guidance.

## Capabilities

### New Capabilities

- `endpoint-signing-secrets`: Endpoint signing-secret generation, encrypted storage, one-time disclosure, tenant-scoped immediate rotation, migration behavior, and dashboard controls.
- `webhook-signatures`: Versioned delivery-job secret transport, HMAC-SHA256 request signing, retry/replay behavior, compatibility, redaction, and verification documentation.

### Modified Capabilities

- None.

## Impact

- **Backend:** endpoint entity/migration, endpoint response mapping, registration and rotation CQRS flows, endpoint authorization, delivery routing/replay publication, configuration validation, and API tests.
- **Delivery worker:** delivery-job normalization, retry propagation, secret decryption, request signing, header redaction assertions, and worker/integration tests.
- **Shared contracts:** a new backward-compatible delivery-job version and retry envelope support.
- **Frontend:** endpoint types/API/hooks and an endpoint-detail signing-secret rotation experience.
- **Operations and docs:** a shared signing-secret encryption key for backend and worker deployments plus webhook signature verification documentation. No new external runtime dependency is required; Node's cryptography APIs provide encryption, hashing, HMAC, randomness, and constant-time comparison.
