## Purpose

Defines how endpoint-scoped webhook signing secrets are issued, protected, disclosed, rotated, and managed by authorized users without leaking stored secret material.

## ADDED Requirements

### Requirement: Endpoint signing-secret issuance and storage
The system SHALL assign every endpoint a unique signing secret containing at least 256 bits of cryptographic randomness. The system MUST protect the secret with authenticated encryption at rest, retain a one-way SHA-256 hash for non-secret identity checks, and MUST NOT persist the plaintext secret.

#### Scenario: New endpoint receives a secret
- **WHEN** an authenticated user registers an endpoint in their workspace
- **THEN** the system creates its signing secret in the same successful workflow and includes the plaintext secret only in that creation response

#### Scenario: Secret generation or encryption fails
- **WHEN** the system cannot securely generate or encrypt the signing secret while registering an endpoint
- **THEN** endpoint registration fails without persisting an endpoint that lacks usable signing material

#### Scenario: Existing endpoint is provisioned during migration
- **WHEN** the signing feature is deployed over an endpoint created by an earlier version
- **THEN** the system provisions encrypted signing material before creating a signing-capable delivery run for that endpoint, without exposing the generated plaintext through a normal read

### Requirement: Stored signing material is not exposed by endpoint reads
The system MUST exclude plaintext secrets, encrypted secret values, and full secret hashes from all endpoint list, lookup, and detail responses. A safe endpoint response MAY expose the signing-secret version and the time at which the current secret was issued.

#### Scenario: Endpoint is fetched after creation
- **WHEN** an authenticated user fetches, lists, updates, enables, or disables an endpoint after its creation response has completed
- **THEN** the response contains no plaintext secret, ciphertext, or full secret hash

#### Scenario: Cross-workspace endpoint is requested
- **WHEN** an authenticated user requests signing-secret information or actions for an endpoint outside their workspace
- **THEN** the system rejects the request as if the endpoint does not exist and reveals no signing metadata

### Requirement: Authorized immediate signing-secret rotation
The system SHALL expose workspace-scoped `POST /api/v1/endpoints/:id/signing-secret/rotate`. A successful rotation SHALL atomically replace the endpoint's signing material, increment its secret version, record the issuance time, preserve all unrelated endpoint configuration, and return the new plaintext secret only in that rotation response. The new secret SHALL be selected for every delivery run created after the rotation commits; no grace-period or dual-signature mode is provided.

#### Scenario: Secret rotates successfully
- **WHEN** an authenticated user rotates the signing secret for an endpoint in their workspace
- **THEN** the response contains the new plaintext secret, version, and issuance time while subsequent endpoint reads remain redacted

#### Scenario: Rotation affects a later run
- **WHEN** rotation commits before an initial or replay delivery run is created for the endpoint
- **THEN** that run snapshots and uses the new signing secret rather than the prior secret

#### Scenario: Rotation fails before commit
- **WHEN** secret generation, encryption, authorization, or persistence fails during rotation
- **THEN** the previously active signing material remains unchanged and no replacement plaintext is returned

### Requirement: Dashboard signing-secret lifecycle controls
The dashboard SHALL let a user rotate an endpoint's signing secret from endpoint detail, require explicit confirmation that existing integrations must be updated, display a newly created or rotated plaintext secret as one-time material with a copy action, and discard that plaintext when the one-time view is closed or the page is reloaded.

#### Scenario: User rotates from endpoint detail
- **WHEN** a user confirms secret rotation and the API succeeds
- **THEN** the dashboard shows the new secret, version, issuance time, and a copy action without placing the plaintext into persistent browser storage

#### Scenario: User closes the one-time secret view
- **WHEN** a user closes the created-secret or rotated-secret view or reloads the page
- **THEN** the dashboard no longer has a way to reveal that plaintext and directs the user to rotate again if it was not saved

#### Scenario: Rotation request fails
- **WHEN** the rotation API rejects or cannot complete the request
- **THEN** the dashboard reports the failure and continues to show the prior safe signing metadata without displaying a guessed or stale replacement secret
