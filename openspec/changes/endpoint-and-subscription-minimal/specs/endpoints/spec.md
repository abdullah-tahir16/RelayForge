## Purpose

Lets a project holder register the HTTP destinations RelayForge will eventually deliver webhooks to, configure how they're called, and take them out of rotation without losing their configuration.

## ADDED Requirements

### Requirement: Register an endpoint for a project the caller owns
The system SHALL allow an authenticated user to register a webhook endpoint for a project in their own workspace, given a name and a URL, with an optional description and delivery timeout. A newly registered endpoint SHALL default to enabled.

#### Scenario: Successful registration
- **WHEN** an authenticated user submits `POST /api/v1/projects/:projectId/endpoints` with a name and a valid `https://` or `http://` URL, for a project in their own workspace
- **THEN** the system creates the endpoint, enabled, and returns it

#### Scenario: Register an endpoint for another workspace's project
- **WHEN** an authenticated user submits `POST /api/v1/projects/:projectId/endpoints` for a project belonging to a different workspace
- **THEN** the system rejects the request as if the project does not exist

### Requirement: Endpoint URLs are validated before being stored
The system SHALL reject an endpoint URL that is not syntactically valid or does not use the `http` or `https` scheme. The system SHALL also reject a URL whose hostname is a literal loopback or link-local address (`localhost`, `127.0.0.1`, `169.254.169.254`, and equivalent literals).

#### Scenario: Malformed URL rejected
- **WHEN** an authenticated user submits an endpoint URL that is not a syntactically valid URL
- **THEN** the system rejects the request without creating an endpoint

#### Scenario: Non-HTTP(S) scheme rejected
- **WHEN** an authenticated user submits an endpoint URL using a scheme other than `http` or `https`
- **THEN** the system rejects the request without creating an endpoint

#### Scenario: Loopback or link-local literal rejected
- **WHEN** an authenticated user submits an endpoint URL whose hostname is `localhost`, `127.0.0.1`, `169.254.169.254`, or an equivalent loopback/link-local literal
- **THEN** the system rejects the request without creating an endpoint

### Requirement: Delivery timeout is configurable within bounds
The system SHALL accept an optional delivery timeout for an endpoint, defaulting to 10000 milliseconds, and SHALL reject a timeout greater than 30000 milliseconds.

#### Scenario: Default timeout applied
- **WHEN** an authenticated user registers an endpoint without specifying a timeout
- **THEN** the system stores a timeout of 10000 milliseconds

#### Scenario: Timeout exceeding the maximum rejected
- **WHEN** an authenticated user registers or updates an endpoint with a timeout greater than 30000 milliseconds
- **THEN** the system rejects the request

### Requirement: List and fetch endpoints scoped to the caller's workspace
The system SHALL allow an authenticated user to list the endpoints for a project in their own workspace, and to fetch a single endpoint by id only if it belongs to their own workspace.

#### Scenario: List own endpoints
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/endpoints` for a project in their own workspace
- **THEN** the system returns every endpoint for that project

#### Scenario: Fetch another workspace's endpoint
- **WHEN** an authenticated user submits `GET /api/v1/endpoints/:id` for an endpoint belonging to a different workspace's project
- **THEN** the system rejects the request as if the endpoint does not exist

### Requirement: Update an endpoint's configuration
The system SHALL allow an authenticated user to update the name, description, URL, and/or timeout of an endpoint in their own workspace, subject to the same URL and timeout validation as registration.

#### Scenario: Successful update
- **WHEN** an authenticated user submits `PATCH /api/v1/endpoints/:id` with a new URL for an endpoint in their own workspace
- **THEN** the system validates the new URL the same way as at registration and updates the endpoint

#### Scenario: Update another workspace's endpoint
- **WHEN** an authenticated user submits `PATCH /api/v1/endpoints/:id` for an endpoint belonging to a different workspace's project
- **THEN** the system rejects the request as if the endpoint does not exist

### Requirement: Enable and disable an endpoint
The system SHALL allow an authenticated user to enable or disable an endpoint in their own workspace. Disabling SHALL record when it happened; enabling SHALL clear that record.

#### Scenario: Disable an endpoint
- **WHEN** an authenticated user submits `POST /api/v1/endpoints/:id/disable` for an endpoint in their own workspace
- **THEN** the system marks the endpoint disabled and records the time it was disabled

#### Scenario: Re-enable a disabled endpoint
- **WHEN** an authenticated user submits `POST /api/v1/endpoints/:id/enable` for a disabled endpoint in their own workspace
- **THEN** the system marks the endpoint enabled and clears its disabled timestamp

#### Scenario: Enable or disable another workspace's endpoint
- **WHEN** an authenticated user submits `POST /api/v1/endpoints/:id/enable` or `/disable` for an endpoint belonging to a different workspace's project
- **THEN** the system rejects the request as if the endpoint does not exist

### Requirement: Delete an endpoint
The system SHALL allow an authenticated user to delete an endpoint in their own workspace. Deleting an endpoint SHALL also delete every subscription registered for it.

#### Scenario: Successful deletion
- **WHEN** an authenticated user submits `DELETE /api/v1/endpoints/:id` for an endpoint in their own workspace
- **THEN** the system deletes the endpoint and every subscription that had been registered for it

#### Scenario: Delete another workspace's endpoint
- **WHEN** an authenticated user submits `DELETE /api/v1/endpoints/:id` for an endpoint belonging to a different workspace's project
- **THEN** the system rejects the request as if the endpoint does not exist
