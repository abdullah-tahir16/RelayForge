## Purpose

Defines the signed webhook wire format and the compatibility, confidentiality, retry, replay, and verification guarantees consumers rely on when authenticating RelayForge deliveries.

## ADDED Requirements

### Requirement: Canonical HMAC-SHA256 webhook signature
For every outbound attempt created from a signing-capable delivery job, the system SHALL serialize the webhook JSON body once, generate a Unix timestamp in whole seconds, compute HMAC-SHA256 over the exact byte sequence `<timestamp>.<raw-body>` using the run's signing secret, and send the lowercase hexadecimal digest as `X-RelayForge-Signature: v1=<digest>`. The value in `X-RelayForge-Timestamp` MUST be exactly the timestamp included in the signed input.

#### Scenario: Signed webhook is sent
- **WHEN** the worker sends an attempt from a signing-capable delivery job
- **THEN** the request contains the existing event, event-id, delivery-id, timestamp, and content-type headers plus a version-1 signature that validates against the exact transmitted body bytes

#### Scenario: Body or timestamp is changed
- **WHEN** a receiver verifies the signature using a body or timestamp value different from the transmitted values
- **THEN** the computed digest does not match the `X-RelayForge-Signature` value

#### Scenario: At-least-once resend occurs
- **WHEN** an expired attempt claim causes the same logical attempt to be sent again
- **THEN** each actual outbound request is signed with the timestamp carried by that request even if its signature differs from an earlier send

### Requirement: Signing material is snapshotted per delivery run
The system SHALL snapshot the endpoint's encrypted current signing secret when it creates an initial or manual replay run. Every retry within that run MUST preserve and use the same encrypted snapshot, while a later run MUST snapshot the endpoint's then-current secret.

#### Scenario: Secret rotates while a run is active
- **WHEN** an endpoint secret rotates after a run's first job was created but before that run retries
- **THEN** the existing run's retries continue using its prior secret snapshot and every run created after rotation uses the new secret

#### Scenario: Terminal delivery is replayed after rotation
- **WHEN** a user rotates an endpoint secret and then replays one of its terminal deliveries
- **THEN** the replay run signs with the rotated secret while preserving the original event payload

#### Scenario: Retry is staged through Kafka
- **WHEN** a failed signed attempt is scheduled and later republished through a retry topic
- **THEN** the encrypted secret snapshot reaches the next attempt unchanged and no plaintext secret is placed in either Kafka message

### Requirement: Signing failures are fail-closed and secret-safe
The system MUST NOT send a webhook when required signing material is missing, malformed, or cannot be authenticated and decrypted. Plaintext secrets, signing ciphertext, and computed signature values MUST NOT be written to logs or persisted attempt diagnostics; persisted request headers SHALL redact the signature value case-insensitively.

#### Scenario: Encrypted signing material cannot be decrypted
- **WHEN** the worker receives a signing-capable job whose signing material cannot be authenticated and decrypted
- **THEN** it sends no HTTP request, does not commit the job as successfully handled, and emits only a secret-free diagnostic

#### Scenario: Signed attempt diagnostics are persisted
- **WHEN** an outbound signed request reaches attempt completion
- **THEN** stored request headers contain a redacted `X-RelayForge-Signature` value and contain no signing secret or ciphertext

### Requirement: Retained delivery-job compatibility
The system SHALL introduce signing through a new delivery-job version and SHALL continue to parse retained version 1, 2, and 3 jobs according to their prior semantics. Jobs from those older versions SHALL remain unsigned because they carry no signing-secret snapshot; routing and replay producers deployed with this capability MUST emit the signing-capable version.

#### Scenario: Retained older job is consumed
- **WHEN** the upgraded worker receives a valid version 1, 2, or 3 delivery job retained from before signing was deployed
- **THEN** it processes the job without a signature using the established normalization, claim, retry, and terminal-state behavior

#### Scenario: New run is published
- **WHEN** the upgraded backend creates an initial or replay run
- **THEN** it publishes the signing-capable job version with an encrypted secret snapshot and all existing run and attempt identity fields

### Requirement: Signature verification documentation
The project SHALL document the signed input and headers and provide a runnable Node.js verification example that uses the raw request body, rejects timestamps outside a documented tolerance before accepting the request, validates the `v1=` scheme, and compares equal-length signature bytes in constant time.

#### Scenario: Integrator follows the Node.js example
- **WHEN** an integrator supplies the exact raw body, current timestamp header, signature header, and endpoint secret to the documented verifier
- **THEN** a valid signature is accepted and a stale timestamp, malformed signature, altered body, or wrong secret is rejected
