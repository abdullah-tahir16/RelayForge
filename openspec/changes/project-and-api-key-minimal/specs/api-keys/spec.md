## Purpose

Lets a project holder mint credentials that a client application will use to authenticate to RelayForge's event-ingestion API, and inspect or revoke them without ever re-exposing their value.

## ADDED Requirements

### Requirement: Generate an API key for a project the caller owns
The system SHALL allow an authenticated user to generate a new API key for a project in their own workspace, given a name for the key. The full key value SHALL be returned exactly once, at creation, and SHALL NOT be retrievable afterward. The system SHALL store only a hash of the key and a short prefix.

#### Scenario: Successful generation
- **WHEN** an authenticated user submits `POST /api/v1/projects/:projectId/api-keys` with a name, for a project in their own workspace
- **THEN** the system returns the full key value along with the key's metadata

#### Scenario: Generate a key for another workspace's project
- **WHEN** an authenticated user submits `POST /api/v1/projects/:projectId/api-keys` for a project belonging to a different workspace
- **THEN** the system rejects the request as if the project does not exist

### Requirement: List API keys for a project, masked
The system SHALL allow an authenticated user to list the API keys for a project in their own workspace. Listed keys SHALL show only their prefix, name, creation date, last-used date, and revocation status — never the full key value or its hash.

#### Scenario: List keys for own project
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/api-keys` for a project in their own workspace
- **THEN** the system returns every key issued for that project, each showing only its prefix and metadata

#### Scenario: Listing never exposes the full key or its hash
- **WHEN** an authenticated user lists API keys for any project they own
- **THEN** no entry in the response contains the full key value or the stored hash

### Requirement: Revoke an API key the caller owns
The system SHALL allow an authenticated user to revoke an API key belonging to a project in their own workspace. A revoked key SHALL be marked with a revocation timestamp and SHALL remain visible in listings.

#### Scenario: Successful revocation
- **WHEN** an authenticated user submits `DELETE /api/v1/api-keys/:id` for a key belonging to a project in their own workspace
- **THEN** the system marks the key revoked and it continues to appear in that project's key list, showing its revoked status

#### Scenario: Revoke a key belonging to another workspace's project
- **WHEN** an authenticated user submits `DELETE /api/v1/api-keys/:id` for a key belonging to a project in a different workspace
- **THEN** the system rejects the request as if the key does not exist
