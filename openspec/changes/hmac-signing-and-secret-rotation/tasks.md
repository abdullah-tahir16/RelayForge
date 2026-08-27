## 1. Shared Signing Primitives and Configuration

- [x] 1.1 Scaffold `packages/webhook-signing` with workspace package metadata, TypeScript configuration, public exports, and backend/worker dependencies
- [x] 1.2 Implement `rfs_` secret generation from 32 random bytes plus SHA-256 hashing with fixed-format and entropy-oriented tests
- [x] 1.3 Implement AES-256-GCM encryption/decryption using the versioned `v1.<nonce>.<ciphertext>.<tag>` envelope and tests for round trips, nonce uniqueness, tampering, wrong keys, and malformed envelopes
- [x] 1.4 Implement canonical `<timestamp>.<raw-body>` HMAC-SHA256 signing and constant-time verification helpers with deterministic positive and negative test vectors
- [x] 1.5 Add strict base64 32-byte `SIGNING_SECRET_ENCRYPTION_KEY` parsing to backend, migration, and worker configuration with secret-free startup errors
- [x] 1.6 Add the shared development-only encryption key to Docker Compose and document how operators generate and inject a production key without logging it

## 2. Endpoint Signing Schema and Migration

- [x] 2.1 Extend `EndpointEntity` with `select: false` encrypted/hash fields plus safe secret version and rotated-at fields
- [x] 2.2 Add a transactional backend-owned migration that creates the signing columns, provisions every existing endpoint with unique encrypted material, verifies the backfill, and applies non-null/default constraints
- [x] 2.3 Implement a guarded down migration that removes only the additive signing columns and clearly accounts for active v4 Kafka jobs before destructive rollback
- [x] 2.4 Add migration tests for empty and populated databases, per-row uniqueness, decryptable backfills, non-null enforcement, invalid/missing key rollback, and down behavior

## 3. Safe Endpoint API and Secret Rotation

- [x] 3.1 Add explicit safe endpoint response DTOs/mappers for create, list, detail, update, enable, and disable paths so entity secret fields can never serialize accidentally
- [x] 3.2 Add an endpoint signing-material service that generates, hashes, encrypts, versions, and timestamps a secret without retaining plaintext beyond the command response
- [x] 3.3 Update endpoint registration to persist signing material atomically and return the plaintext only in the additive one-time creation response
- [x] 3.4 Add `RotateSigningSecretCommand` and handler using existing workspace authorization, a locked atomic update, version increment, and `{ signingSecret, version, rotatedAt }` response
- [x] 3.5 Expose authenticated `POST /api/v1/endpoints/:id/signing-secret/rotate` with cross-workspace not-found semantics and support for enabled or disabled endpoints
- [x] 3.6 Add controller/handler tests proving normal endpoint responses omit plaintext, ciphertext, and full hashes while creation and rotation disclose only the newly issued plaintext
- [x] 3.7 Add concurrency and failure tests proving rotations are serialized, unrelated endpoint fields are preserved, and generation/encryption/persistence failures leave the prior material active

## 4. Delivery-Job v4 and Backend Publication

- [x] 4.1 Add `DeliveryRequestedMessageV4` with encrypted secret snapshot/version fields and extend normalized delivery types without changing v1-v3 normalization
- [x] 4.2 Extend the retry-envelope contract to carry v4 jobs and add contract tests showing serialized Kafka payloads contain ciphertext but never plaintext secrets
- [x] 4.3 Add an explicit endpoint repository query that selects encrypted signing material only for routing while ordinary endpoint queries remain secret-free
- [x] 4.4 Update initial routing to emit v4 jobs with the endpoint's current encrypted signing material and existing run/attempt identity fields
- [x] 4.5 Update replay selection/publication to emit v4 jobs using the endpoint's current signing material while retaining the immutable original event payload
- [x] 4.6 Add routing and replay tests proving a rotation is selected by later runs, active published runs keep their prior snapshot, duplicate routing remains idempotent, and no plaintext reaches Kafka

## 5. Worker Request Signing and Retry Propagation

- [x] 5.1 Refactor webhook request construction to serialize the body and capture one whole-second timestamp before deriving headers
- [x] 5.2 Decrypt and authenticate v4 signing material, sign the exact transmitted body bytes, and add `X-RelayForge-Signature: v1=<lowercase-hex>` using the same timestamp header value
- [x] 5.3 Keep normalized v1-v3 jobs unsigned while preserving all existing claim, retry, run, and terminal-state behavior
- [x] 5.4 Update retry publication so every v4 retry preserves the original encrypted signing snapshot/version while advancing only job and attempt metadata
- [x] 5.5 Make missing, malformed, tampered, or undecryptable v4 material fail before HTTP, leave the source offset uncommitted, and emit only sanitized diagnostics
- [x] 5.6 Verify case-insensitive attempt-header redaction always replaces `X-RelayForge-Signature` and never persists secret plaintext or ciphertext
- [x] 5.7 Add request-builder/consumer unit tests for exact-body signatures, timestamp agreement, altered body/timestamp failures, fresh signatures on at-least-once resends, and legacy unsigned requests
- [x] 5.8 Add worker integration tests for signed success, signed retry success, retry exhaustion, duplicate/stale claims, decryption failure with zero sends, and secret-safe attempt history

## 6. Endpoint Secret Dashboard Experience

- [x] 6.1 Extend frontend endpoint/create/rotation types and pure API functions without adding plaintext secret fields to reusable normal endpoint models
- [x] 6.2 Add a rotation mutation hook with endpoint-query invalidation only after success and no persistence of returned plaintext in the query cache
- [x] 6.3 Add a one-time secret dialog for endpoint creation with copy action, save-before-close warning, acknowledgement flow, and component-local plaintext state
- [x] 6.4 Add an endpoint-detail Signing Secret section showing safe version/issuance metadata, backfilled-secret guidance, and a confirmed rotate action
- [x] 6.5 Show the rotated secret in the same ephemeral one-time experience and communicate that active retries can continue using the prior run snapshot
- [x] 6.6 Add frontend tests for create/rotate success, confirmation, copy behavior, close/reload disposal, API failure, query invalidation, cross-workspace errors, and absence from local/session storage
- [x] 6.7 Verify the secret controls and dialogs remain keyboard accessible and readable at narrow viewport widths using the existing shared UI wrappers

## 7. Verification Guidance and Security Documentation

- [x] 7.1 Add webhook signature verification documentation covering headers, `timestamp.raw-body` canonicalization, lowercase hex format, raw-body capture, rotation/run-snapshot semantics, and the at-least-once resend model
- [x] 7.2 Add a runnable Node.js verifier that validates `v1=`, enforces a documented five-minute freshness tolerance, handles malformed inputs, and uses equal-length `timingSafeEqual`
- [x] 7.3 Test the documentation verifier against the shared fixed vectors plus stale timestamp, wrong secret, changed body, changed timestamp, malformed hex, and length-mismatch cases
- [x] 7.4 Update `LLM_CONTEXT.md` with signing-secret confidentiality, delivery-job v4 compatibility, per-run snapshot semantics, and the deployment encryption-key constraint

## 8. End-to-End Verification and Handoff

- [x] 8.1 Run backend, delivery-worker, shared-package, and frontend formatting/lint checks, typechecks, unit tests, relevant integration/E2E suites, and production builds
- [x] 8.2 Exercise create → copy secret → signed initial delivery → receiver verification against Docker Compose and inspect PostgreSQL/Kafka/attempt data for plaintext leakage
- [x] 8.3 Exercise failure → staged retry → rotation → old-run retry → new replay and verify the old run remains on its snapshot while the replay uses the rotated secret
- [x] 8.4 Exercise retained v1/v2/v3 jobs on the upgraded worker and confirm their established unsigned compatibility behavior and state transitions
- [x] 8.5 Verify wrong-key and tampered-envelope failures send no HTTP request, commit no delivery offset, and expose no secret-bearing diagnostic data
- [x] 8.6 Move the roadmap entry through Proposed/Doing/Done according to task progress while preserving the remaining Phase 3 dependency order
- [x] 8.7 Run `openspec validate hmac-signing-and-secret-rotation --strict` and resolve every reported issue
