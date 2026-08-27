## Context

The backend currently stores endpoints without signing material and publishes version-3 delivery jobs containing endpoint URL/timeout plus immutable event/run identity. The delivery worker intentionally does not read endpoint rows; it builds the exact JSON body from the job, persists redacted request headers, and carries the same normalized job through staged Kafka retries. Replay already snapshots the endpoint's current URL and timeout into a new run. See `proposal.md` for motivation and the two delta specs for the behavior contract.

This change crosses the backend, shared Kafka contracts, delivery worker, frontend, database, deployment configuration, and public integration documentation. The main constraints are keeping plaintext secrets out of PostgreSQL and Kafka, preserving retained v1-v3 jobs, not weakening at-least-once claim/retry behavior, and avoiding direct serialization of new secret columns from TypeORM entities.

## Goals / Non-Goals

**Goals:**
- Make signing material cryptographically strong, encrypted wherever it is persisted, and available to the worker without adding endpoint-table reads.
- Give new and replayed runs stable signing semantics across retries and endpoint secret rotations.
- Make accidental API/log/attempt-history leakage difficult through explicit DTOs, `select: false` columns, redaction, and tests.
- Preserve rolling compatibility with all currently accepted delivery-job versions.

**Non-Goals:**
- No dual-signature overlap window, scheduled rotation, secret history, automatic recipient coordination, or rollback to a prior endpoint secret.
- No rotation of the deployment-level encryption key or external KMS integration; the encrypted envelope is versioned so those can be added later.
- No inbound webhook verification service or multi-language SDK. This change documents a Node.js consumer example only.
- No audit-log record for rotation until the planned `audit-logs` capability exists.
- No changes to endpoint-test delivery, idempotency, SSRF/redirect enforcement, or the at-least-once HTTP guarantee.

## Decisions

**1. Centralize secret and signature primitives in a small internal `packages/webhook-signing` package using Node crypto.**

The package generates `rfs_`-prefixed secrets from 32 random bytes encoded base64url, hashes the full displayed secret with SHA-256, performs authenticated encryption/decryption, builds the canonical signed input, and produces the HMAC-SHA256 hexadecimal digest. Backend code uses generation/encryption/hash; the worker uses decryption/signing; tests and documentation fixtures share deterministic vectors. The package accepts keys and values as arguments and does not read environment variables itself.

*Alternative considered:* duplicate crypto code in both apps. Rejected because canonicalization or envelope drift would be a security and interoperability bug. An external cryptography dependency is unnecessary for primitives supplied by Node.

**2. Encrypt secrets with AES-256-GCM under one required deployment key and a versioned envelope.**

`SIGNING_SECRET_ENCRYPTION_KEY` is base64 representing exactly 32 bytes and is supplied identically to the backend, migrations, and worker. Production startup/config loading fails on a missing or malformed key; Compose receives an explicitly marked development-only value. Each encryption uses a fresh 96-bit nonce and stores a self-describing `v1.<nonce>.<ciphertext>.<tag>` base64url envelope. GCM authentication makes a wrong key or altered envelope fail before HMAC use. The database stores `signing_secret_encrypted`, `signing_secret_hash`, `signing_secret_version`, and `signing_secret_rotated_at`; secret-bearing columns use `select: false` and all controller responses go through safe DTO mappers.

*Alternative considered:* put plaintext in Kafka after decrypting it in the backend. Rejected because Kafka retains messages at rest. Hash-only storage cannot work because HMAC signing requires the original secret. A KMS/envelope-key system is preferable at larger scale but is outside this self-hosted milestone.

**3. Create and disclose endpoint secrets once, then rotate through a dedicated tenant-scoped command.**

Registration generates signing material before saving and returns an additive `signingSecret` field only on the create response. Normal endpoint create/update/query handlers return explicit safe DTOs instead of entities. `RotateSigningSecretCommand` reuses endpoint authorization, generates new material, locks/updates the owned endpoint transactionally, increments the secret version, and returns `{ signingSecret, version, rotatedAt }`. The endpoint detail response exposes only version/time. Rotation is allowed for disabled endpoints because preparing credentials before re-enable is useful.

Existing endpoints are backfilled with unrevealed secrets in the schema migration. If migration-time provisioning fails, the migration rolls back. An operator who needs an existing endpoint's plaintext rotates it once. New columns become non-null after the backfill so application code cannot create an endpoint without signing material.

*Alternatives considered:* allow revealing the stored secret repeatedly, or retain old endpoint secrets for a grace period. Repeated reveal expands the decryption/API attack surface; grace periods require secret history, dual signatures, expiry policy, and a different header contract not present in the source design. Immediate single-secret selection keeps rotation comprehensible. Active runs are handled separately by snapshotting, below.

**4. Snapshot encrypted signing material in delivery-job v4, never plaintext, and keep it stable for one run.**

Add `DeliveryRequestedMessageV4`, retaining every v3 field and adding `endpointSigningSecretEncrypted` plus `endpointSigningSecretVersion`. Routing explicitly selects the encrypted endpoint field and emits v4. Replay selects the endpoint's current encrypted material and emits v4. The retry-envelope union accepts v4, and retry publication copies the normalized encrypted value and secret version unchanged when it advances attempt/run-attempt numbers.

The worker normalizer accepts v1-v4. V1-v3 normalize exactly as today and carry no signing material, so retained jobs remain unsigned. V4 requires both signing fields and is the only signing-capable variant. This keeps the worker independent of endpoint tables and ensures that retries for one run remain verifiable with the same endpoint secret even if a user rotates during the retry window. A new replay is a new run and snapshots the current secret, matching the established replay rule for endpoint configuration.

*Alternatives considered:* fetch the current endpoint secret before every attempt, or mutate queued retry messages on rotation. Per-attempt lookup breaks the worker's deliberate data-access boundary and makes one run switch credentials mid-flight; rewriting Kafka history is not practical. Passing plaintext in v4 was rejected for at-rest confidentiality.

**5. Serialize once, sign the exact bytes, and fail closed before outbound HTTP.**

Refactor request construction into two phases: build the body and timestamp once, then for v4 authenticate/decrypt the envelope and add `X-RelayForge-Signature` computed over UTF-8 bytes of `${timestamp}.${body}`. The existing `X-RelayForge-Timestamp` uses that same captured timestamp. Lowercase 64-character hexadecimal remains the digest encoding and `v1` denotes the signing scheme, not the endpoint secret version.

The worker validates its encryption key at startup. A malformed v4 envelope or decryption failure throws a sanitized processing error before `fetch`, leaves the Kafka offset uncommitted, and never logs the job or secret value. Existing case-insensitive request-header redaction already includes `x-relayforge-signature`; tests make that invariant explicit. Each genuine at-least-once resend builds a fresh timestamp/signature, which is appropriate because the receiver evaluates request freshness.

*Alternative considered:* sign a reconstructed or canonicalized JSON object independently from the transmitted body. Rejected because even harmless serialization differences would make valid requests unverifiable. Signing the exact body string eliminates that class of mismatch.

**6. Treat the frontend secret as ephemeral one-time state and publish receiver-focused verification guidance.**

Endpoint creation and rotation mutations may place the returned plaintext only in component/mutation state used by a non-dismissible-until-acknowledged secret dialog; it is never cached in a reusable endpoint query, local/session storage, URL, or telemetry. Endpoint detail shows safe version/time metadata, a rotation warning, and confirmation. Closing or reloading destroys the plaintext.

Add a focused webhook-signature verification document with the wire format, raw-body warning, a five-minute example tolerance, malformed-header handling, and a runnable Node.js example using `timingSafeEqual` only after length equality. Fixed test vectors verify both the internal signer and documentation example.

*Alternative considered:* place verification code in the dashboard. Rejected because receivers need copyable server-side guidance independent of the RelayForge UI and framework body parsing can otherwise destroy the raw bytes.

## Risks / Trade-offs

- **[Rotating while a run is retrying means two endpoint secrets can be valid in flight]** → The confirmation and verification docs state that active runs retain their snapshot; operators keep the prior secret through their maximum retry window or replay affected deliveries after rotation. No request carries both signatures.
- **[One shared encryption key is a high-value deployment secret]** → Require exactly 32 random bytes, never log it, inject it through deployment secret management, use authenticated per-record nonces, and reserve the envelope version for future KMS/key-id support.
- **[A wrong key can make all v4 jobs undecryptable]** → Both services validate configuration at startup, deterministic cross-service tests use the same fixture, GCM fails closed, and the deployment order verifies the worker before enabling v4 publication.
- **[Backfilled endpoint secrets were never shown to users]** → Existing integrations may ignore the additive signature header; endpoint detail explains that a rotation is required to obtain a known secret.
- **[Retained v1-v3 jobs remain unsigned during cutover]** → This is explicit compatibility behavior. Deploy the v4-capable worker first and allow retained/retry work to drain when an operator requires a strict all-signed boundary.
- **[Entity columns could leak through an accidental future controller return]** → Combine `select: false`, explicit safe response DTOs/mappers, no entity return types at endpoint controllers, and serialization regression tests.

## Migration Plan

1. Generate and distribute the same base64 32-byte `SIGNING_SECRET_ENCRYPTION_KEY` to migration execution, backend, and delivery worker; add the documented development-only Compose value.
2. Run an additive transactional migration that adds the endpoint signing columns, cryptographically provisions every existing row, verifies none remain null, and then applies non-null constraints. Roll back the transaction if key validation, encryption, or any row update fails.
3. Publish the shared package and delivery-job v4 types, then deploy the v4-capable worker first. It continues consuming v1-v3 jobs and retry envelopes.
4. Deploy the backend migration-aware endpoint registration/rotation flows and switch routing/replay producers to v4. Confirm a fixed signing vector across both apps before enabling traffic.
5. Deploy the safe endpoint DTO/frontend experience and verification documentation, then exercise create, rotate, initial delivery, retry, replay, cross-workspace denial, and redaction paths end to end.

For application rollback, stop v4 publication first and revert the backend producer to v3 while leaving the upgraded worker in place; it understands both versions. The additive columns and encrypted data can remain unused. Do not remove the encryption key, package support, or columns until Kafka retention and every retry stage can no longer contain v4 jobs. A later controlled migration may drop the columns only after that drain is proven.
