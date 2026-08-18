## ADDED Requirements

### Requirement: List events for a project, paginated and filterable
The system SHALL allow an authenticated dashboard user to list events for a project in their own workspace via `GET /api/v1/projects/:projectId/events`, returning a paginated envelope (`items`, `total`, `page`, `pageSize`) rather than a bare array. The system SHALL accept optional filters: `eventType` (exact match), `status`, `createdFrom`/`createdTo` (date range), and `endpointId` (events with at least one delivery to that endpoint).

#### Scenario: List own project's events
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/events` for a project in their own workspace
- **THEN** the system returns a paginated envelope of that project's events, most recent first

#### Scenario: Filter by event type
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/events?eventType=order.completed`
- **THEN** the system returns only events whose type exactly matches

#### Scenario: Filter by status
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/events?status=FAILED`
- **THEN** the system returns only events at that status

#### Scenario: Filter by endpoint
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/events?endpointId=:id`
- **THEN** the system returns only events that have at least one Delivery record for that endpoint

#### Scenario: List another workspace's project events
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/events` for a project belonging to a different workspace
- **THEN** the system rejects the request as if the project does not exist

### Requirement: Fetch a single event by id, scoped to the caller's workspace
The system SHALL allow an authenticated dashboard user to fetch one event by id, returning its full payload, metadata, and status, only if it belongs to a project in their own workspace.

#### Scenario: Fetch own event
- **WHEN** an authenticated user submits `GET /api/v1/events/:id` for an event belonging to their own workspace
- **THEN** the system returns the event's id, type, status, payload, metadata, and timestamps

#### Scenario: Fetch another workspace's event
- **WHEN** an authenticated user submits `GET /api/v1/events/:id` for an event belonging to a different workspace's project
- **THEN** the system rejects the request as if the event does not exist
