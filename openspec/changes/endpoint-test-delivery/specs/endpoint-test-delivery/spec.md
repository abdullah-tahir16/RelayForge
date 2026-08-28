## Purpose

Lets dashboard users verify one configured webhook endpoint by sending a clearly marked synthetic delivery through RelayForge's normal asynchronous delivery machinery.

## ADDED Requirements

### Requirement: Users can start a test delivery for one endpoint
The system SHALL expose authenticated `POST /api/v1/endpoints/:id/test` for an Endpoint in the caller's workspace. A successful request SHALL create one synthetic test Event and one Delivery targeted only at that Endpoint, then publish the first delivery job asynchronously and respond `202 Accepted` without waiting for the webhook response.

#### Scenario: Test delivery accepted
- **WHEN** an authenticated user requests a test delivery for an enabled Endpoint in their workspace
- **THEN** the system creates a synthetic test Event, creates exactly one Delivery for the requested Endpoint, publishes its first delivery job, and responds `202 Accepted` with identifiers for the Event, Delivery, and initial run

#### Scenario: Endpoint belongs to another workspace
- **WHEN** an authenticated user requests a test delivery for an Endpoint outside their workspace
- **THEN** the system rejects the request as if the Endpoint does not exist and creates no Event, Delivery, run, attempt, or delivery job

#### Scenario: Endpoint is disabled
- **WHEN** an authenticated user requests a test delivery for a disabled Endpoint in their workspace
- **THEN** the system returns a conflict and creates no Event, Delivery, run, attempt, or delivery job

#### Scenario: Publication fails after persistence
- **WHEN** the synthetic Event, Delivery, and initial run are persisted but the first delivery job cannot be published
- **THEN** the system reports a retryable failure and a repeated test request for the same Endpoint creates a new test lifecycle rather than mutating the failed publication record

### Requirement: Test deliveries are clearly marked as synthetic traffic
The synthetic test Event SHALL use the reserved event type `relayforge.endpoint.test`, a built-in JSON payload, and metadata that identifies it as endpoint-test traffic. Event and delivery query responses SHALL expose enough information for the dashboard to distinguish test traffic from customer-originated events.

#### Scenario: Test event is inspected
- **WHEN** an authorized user views the Event or Delivery created by an endpoint test
- **THEN** the response identifies the Event as test traffic and includes the reserved event type, built-in payload, created time, Delivery status, and linked Endpoint information

#### Scenario: Test event appears in event history
- **WHEN** an authorized user lists a project's Events after starting an endpoint test
- **THEN** the synthetic test Event appears in the same history as other Events with a visible test marker

#### Scenario: Customer-originated event is inspected
- **WHEN** an authorized user views or lists an Event created through the normal event ingestion API
- **THEN** the response does not mark that Event as endpoint-test traffic unless it carries the system-created endpoint-test metadata

### Requirement: Test deliveries reuse normal delivery behavior
The test Delivery SHALL use the Endpoint's current URL, timeout, signing secret, and enabled state at test-start time. Delivery attempts SHALL be signed when the Endpoint is signing-capable, recorded in attempt history, retried according to the configured retry policy, and dead-lettered if the run exhausts its attempt budget.

#### Scenario: Test webhook request is sent
- **WHEN** the worker processes the first job for a test Delivery
- **THEN** it sends the built-in payload to the requested Endpoint with the normal RelayForge event, event-id, delivery-id, timestamp, content-type, and signature headers

#### Scenario: Test delivery fails and retries
- **WHEN** the target Endpoint returns a retryable failure or cannot be reached
- **THEN** the system records the failed attempt and schedules retries using the same bounded retry behavior as customer-originated deliveries

#### Scenario: Test delivery exhausts retries
- **WHEN** a test Delivery exhausts its attempt budget
- **THEN** its latest run becomes dead-lettered and remains inspectable through the existing run, attempt, Event, and DLQ views

### Requirement: Dashboard users can trigger and inspect endpoint tests
The dashboard SHALL let a user start an endpoint test from the Endpoint detail view, show whether the test was accepted or rejected, and provide a path to inspect the resulting Event/Delivery status and attempt history without a full page reload.

#### Scenario: User starts a test from endpoint detail
- **WHEN** a dashboard user clicks the test action for an enabled Endpoint
- **THEN** the UI calls `POST /api/v1/endpoints/:id/test`, reports that the test started, and links to or opens the created test Event/Delivery details

#### Scenario: User tests a disabled endpoint
- **WHEN** a dashboard user attempts to test a disabled Endpoint
- **THEN** the UI reports that disabled endpoints cannot receive test deliveries and leaves existing endpoint data unchanged

#### Scenario: Test result changes while user is viewing it
- **WHEN** a test Delivery transitions through processing, retrying, succeeded, or dead-lettered states
- **THEN** periodic refresh eventually updates the visible Event, Delivery, run, and attempt state without a full page reload
