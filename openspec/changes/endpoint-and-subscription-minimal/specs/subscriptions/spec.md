## Purpose

Lets an endpoint owner declare which events an endpoint should receive, using exact event types or wildcard patterns, without yet routing or delivering anything.

## ADDED Requirements

### Requirement: Subscribe an endpoint to an event pattern
The system SHALL allow an authenticated user to subscribe an endpoint they own to an event pattern. A pattern SHALL be either the literal `*`, or one or more dot-separated lowercase alphanumeric segments optionally ending in a final `.*` segment. The system SHALL NOT validate a pattern against any fixed list of event types.

#### Scenario: Subscribe to an exact event type
- **WHEN** an authenticated user submits `POST /api/v1/endpoints/:id/subscriptions` with the pattern `order.completed`, for an endpoint in their own workspace
- **THEN** the system creates the subscription

#### Scenario: Subscribe to a single-level wildcard
- **WHEN** an authenticated user submits `POST /api/v1/endpoints/:id/subscriptions` with the pattern `order.*`, for an endpoint in their own workspace
- **THEN** the system creates the subscription

#### Scenario: Subscribe to everything
- **WHEN** an authenticated user submits `POST /api/v1/endpoints/:id/subscriptions` with the pattern `*`, for an endpoint in their own workspace
- **THEN** the system creates the subscription

#### Scenario: Malformed pattern rejected
- **WHEN** an authenticated user submits a pattern that is not the literal `*` and does not consist of dot-separated lowercase alphanumeric segments (with an optional trailing `.*`)
- **THEN** the system rejects the request without creating a subscription

#### Scenario: Subscribe an endpoint belonging to another workspace
- **WHEN** an authenticated user submits `POST /api/v1/endpoints/:id/subscriptions` for an endpoint belonging to a different workspace's project
- **THEN** the system rejects the request as if the endpoint does not exist

### Requirement: List subscriptions for an endpoint the caller owns
The system SHALL allow an authenticated user to list the subscriptions for an endpoint in their own workspace.

#### Scenario: List own endpoint's subscriptions
- **WHEN** an authenticated user submits `GET /api/v1/endpoints/:id/subscriptions` for an endpoint in their own workspace
- **THEN** the system returns every subscription registered for that endpoint

#### Scenario: List subscriptions for another workspace's endpoint
- **WHEN** an authenticated user submits `GET /api/v1/endpoints/:id/subscriptions` for an endpoint belonging to a different workspace's project
- **THEN** the system rejects the request as if the endpoint does not exist

### Requirement: Unsubscribe
The system SHALL allow an authenticated user to remove a subscription belonging to an endpoint in their own workspace.

#### Scenario: Successful unsubscribe
- **WHEN** an authenticated user submits `DELETE /api/v1/subscriptions/:id` for a subscription belonging to an endpoint in their own workspace
- **THEN** the system deletes the subscription

#### Scenario: Unsubscribe from another workspace's endpoint
- **WHEN** an authenticated user submits `DELETE /api/v1/subscriptions/:id` for a subscription belonging to an endpoint in a different workspace's project
- **THEN** the system rejects the request as if the subscription does not exist
