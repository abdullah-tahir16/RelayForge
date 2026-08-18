## Purpose

Lets a project's client applications publish events into RelayForge, durably and quickly, without waiting for any webhook destination to respond.

## ADDED Requirements

### Requirement: Ingest an event authenticated by project API key
The system SHALL allow a request bearing a valid, non-revoked project API key in `Authorization: Bearer <key>`, together with an event type and a JSON data payload, to create an Event scoped to that key's project. The system SHALL reject a request whose bearer token is missing, malformed, does not match any stored key hash, or matches a revoked key.

#### Scenario: Successful ingestion
- **WHEN** a request submits `POST /api/v1/events` with `Authorization: Bearer <valid project API key>`, an `event` type, and a `data` object
- **THEN** the system creates an Event scoped to that key's project, publishes it, and responds `202 Accepted` with the event's id, event type, status `PUBLISHED`, and creation time

#### Scenario: Missing or malformed API key rejected
- **WHEN** a request submits `POST /api/v1/events` without an `Authorization: Bearer` header, or with a token that does not match any stored key hash
- **THEN** the system rejects the request without creating an Event

#### Scenario: Revoked key rejected
- **WHEN** a request submits `POST /api/v1/events` with a bearer token matching a revoked API key
- **THEN** the system rejects the request without creating an Event

### Requirement: Event type is a well-formed identifier
The system SHALL require the `event` field to be one or more dot-separated lowercase alphanumeric segments (the same shape a subscription's exact-match pattern uses), with no wildcard.

#### Scenario: Well-formed event type accepted
- **WHEN** a request submits `POST /api/v1/events` with `event` set to `order.completed`
- **THEN** the system accepts the event type

#### Scenario: Malformed event type rejected
- **WHEN** a request submits `POST /api/v1/events` with an `event` value that is not dot-separated lowercase alphanumeric segments
- **THEN** the system rejects the request without creating an Event

### Requirement: Event payload size is bounded
The system SHALL reject a request whose `data` payload exceeds the configured maximum (256 KB by default) with `413 Payload Too Large`, without creating an Event.

#### Scenario: Oversized payload rejected
- **WHEN** a request submits `POST /api/v1/events` with a `data` payload larger than the configured maximum
- **THEN** the system responds `413 Payload Too Large` and does not create an Event

### Requirement: Event is persisted before it is published
The system SHALL persist an accepted event to PostgreSQL with status `ACCEPTED` before publishing it to the event stream, then advance its status to `PUBLISHED` once publishing succeeds. If publishing fails, the system SHALL respond with an error rather than `202 Accepted`, and the event SHALL remain at status `ACCEPTED`.

#### Scenario: Event durably recorded before publish
- **WHEN** an event is successfully ingested
- **THEN** the Event record exists in PostgreSQL, and its status is `PUBLISHED` only after the publish to the event stream succeeds

#### Scenario: Publish failure surfaces as an error
- **WHEN** an event has been persisted with status `ACCEPTED` but publishing it to the event stream fails
- **THEN** the system responds with an error, not `202 Accepted`, and the event's status remains `ACCEPTED`

### Requirement: Ingestion responds without waiting on delivery
The system SHALL respond to an ingestion request as soon as the event is persisted and published, without waiting for routing, delivery, or any webhook destination's response.

#### Scenario: Response precedes delivery outcome
- **WHEN** an event is ingested for a project that has one or more matching, enabled subscriptions
- **THEN** the system returns its `202 Accepted` response before any webhook delivery attempt for that event completes
