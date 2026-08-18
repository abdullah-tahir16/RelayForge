## ADDED Requirements

### Requirement: List deliveries for a project, paginated and filterable
The system SHALL allow an authenticated dashboard user to list deliveries for a project in their own workspace via `GET /api/v1/projects/:projectId/deliveries`, returning a paginated envelope (`items`, `total`, `page`, `pageSize`). The system SHALL accept optional filters: `status`, `endpointId`, `httpStatusCode`, `eventId`, and a created-date range.

#### Scenario: List own project's deliveries
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/deliveries` for a project in their own workspace
- **THEN** the system returns a paginated envelope of that project's deliveries, most recent first

#### Scenario: Filter by status
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/deliveries?status=FAILED`
- **THEN** the system returns only deliveries at that status

#### Scenario: Filter by endpoint
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/deliveries?endpointId=:id`
- **THEN** the system returns only deliveries for that endpoint

#### Scenario: Filter by HTTP status code
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/deliveries?httpStatusCode=500`
- **THEN** the system returns only deliveries whose recorded HTTP status code matches

#### Scenario: Filter by event
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/deliveries?eventId=:id`
- **THEN** the system returns only deliveries created for that event

#### Scenario: List another workspace's project deliveries
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/deliveries` for a project belonging to a different workspace
- **THEN** the system rejects the request as if the project does not exist

### Requirement: Delivery outcome records the HTTP status code and duration
The system SHALL record the responding endpoint's HTTP status code and the delivery attempt's duration in milliseconds whenever a delivery resolves to `SUCCEEDED` or `FAILED` with an actual HTTP response. A delivery that fails because the endpoint was unreachable or timed out SHALL still record its duration, with no HTTP status code.

#### Scenario: Successful delivery records status code and duration
- **WHEN** an endpoint responds with a `2xx` status to a delivery's webhook request
- **THEN** the system records that status code and the elapsed duration on the Delivery record

#### Scenario: Failed delivery with a response records status code and duration
- **WHEN** an endpoint responds with a non-`2xx` status to a delivery's webhook request
- **THEN** the system records that status code and the elapsed duration on the Delivery record

#### Scenario: Unreachable endpoint records duration only
- **WHEN** an endpoint is unreachable or times out
- **THEN** the system records the elapsed duration on the Delivery record with no HTTP status code
