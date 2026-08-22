## Purpose

Makes outbound webhook delivery observable and resilient by preserving each HTTP attempt and retrying failed deliveries on a durable, bounded schedule.

## ADDED Requirements

### Requirement: Every outbound request has an immutable attempt record
The system SHALL create one Delivery Attempt record for every logical outbound webhook attempt. Each record SHALL identify the delivery and attempt number and, when available, contain redacted request headers, response status, redacted response headers, a bounded response-body preview, duration, transport error code and message, start time, and completion time. Attempt numbers SHALL be unique and monotonically increasing within a delivery.

#### Scenario: Successful request is recorded
- **WHEN** an endpoint returns a `2xx` response
- **THEN** the system records the attempt number, redacted request and response metadata, HTTP status, bounded response preview, duration, and timestamps before marking the delivery `SUCCEEDED`

#### Scenario: Error response is recorded
- **WHEN** an endpoint returns a non-`2xx` response
- **THEN** the system records the HTTP outcome and diagnostic metadata for that attempt before scheduling another attempt or exhausting the delivery

#### Scenario: Transport failure is recorded
- **WHEN** a webhook request times out or fails before receiving an HTTP response
- **THEN** the system records the duration and a safe transport error code and message with no fabricated HTTP status

#### Scenario: Sensitive headers are redacted
- **WHEN** stored request or response headers contain configured sensitive names such as `Authorization`, `Cookie`, `Set-Cookie`, or a signing-secret header
- **THEN** the system stores and returns redacted values rather than the secrets

### Requirement: Failed deliveries follow a bounded retry schedule
The system SHALL make at most five attempts per delivery by default: the initial attempt immediately, followed after failures by attempts no earlier than 30 seconds, 2 minutes, 10 minutes, and 1 hour after their preceding attempt. The retry schedule SHALL be configurable, and every non-`2xx`, timeout, DNS, connection, or TLS failure SHALL be retryable under the configured schedule. A success on any attempt SHALL stop further attempts.

#### Scenario: First failure schedules the second attempt
- **WHEN** the initial webhook attempt fails
- **THEN** the delivery becomes `RETRYING`, exposes its next-attempt time, and is not attempted again before the configured first delay elapses

#### Scenario: Later retry succeeds
- **WHEN** a retry receives a `2xx` response before the attempt limit is exhausted
- **THEN** the delivery becomes `SUCCEEDED` and the system schedules no further attempt

#### Scenario: All attempts fail
- **WHEN** every allowed attempt for a delivery fails
- **THEN** the delivery becomes terminal `FAILED`, has no next-attempt time, and contains one completed Delivery Attempt record for each allowed attempt

#### Scenario: Custom retry schedule
- **WHEN** an operator supplies a valid retry schedule and attempt limit
- **THEN** newly scheduled attempts use that configuration instead of the default delays

### Requirement: Delivery state reflects active and scheduled work
The system SHALL expose `PROCESSING` while an attempt is actively owned by a worker and `RETRYING` while a failed delivery is waiting for its next attempt. `attemptCount` SHALL equal the number of completed Delivery Attempt records. An event SHALL remain `PROCESSING` while any of its deliveries is `PENDING`, `PROCESSING`, or `RETRYING`, and SHALL receive its final aggregate status only after all of its deliveries are `SUCCEEDED` or exhausted `FAILED`.

#### Scenario: Worker starts an attempt
- **WHEN** a worker successfully claims a due delivery attempt
- **THEN** the delivery becomes `PROCESSING` without incrementing `attemptCount` until the attempt completes

#### Scenario: Event has a waiting retry
- **WHEN** at least one delivery for an event is `RETRYING`
- **THEN** the event remains `PROCESSING` rather than becoming `FAILED` or `PARTIALLY_FAILED`

#### Scenario: Event resolves after retries finish
- **WHEN** every delivery for an event is either `SUCCEEDED` or exhausted `FAILED`
- **THEN** the system computes `COMPLETED`, `PARTIALLY_FAILED`, or `FAILED` from those terminal delivery outcomes

### Requirement: Scheduled retries survive restarts and duplicate messages
The system SHALL durably retain a scheduled retry until it has been republished for processing, SHALL NOT process it before its `notBefore` time, and SHALL tolerate duplicate delivery or retry messages. For a given delivery and attempt number, duplicate messages SHALL NOT create duplicate attempt records or cause concurrent webhook requests. If a worker loses ownership after the remote outcome becomes unknowable, the system MAY send the request again after ownership recovery as part of its documented at-least-once guarantee.

#### Scenario: Worker restarts during retry delay
- **WHEN** a worker stops after a retry is scheduled and restarts before or after the retry becomes due
- **THEN** the retry remains available and is eventually submitted for processing no earlier than its scheduled time

#### Scenario: Retry message is delivered twice
- **WHEN** Kafka delivers the same scheduled-retry message more than once
- **THEN** at most one active claim and one Delivery Attempt record exist for that delivery and attempt number

#### Scenario: Completed attempt message is redelivered
- **WHEN** a delivery-job message for an already completed attempt is processed again
- **THEN** the system acknowledges it without sending another webhook request

### Requirement: Users can inspect delivery attempt history within their workspace
The system SHALL allow an authenticated dashboard user to list a delivery's attempts via `GET /api/v1/deliveries/:deliveryId/attempts` only when the delivery belongs to the user's workspace. Results SHALL be ordered by attempt number and SHALL never expose unredacted sensitive headers.

#### Scenario: User lists attempts for their delivery
- **WHEN** an authenticated user requests attempts for a delivery belonging to their workspace
- **THEN** the system returns the delivery's attempts in ascending attempt-number order with recorded diagnostic fields

#### Scenario: User requests another workspace's attempts
- **WHEN** an authenticated user requests attempts for a delivery belonging to another workspace
- **THEN** the system rejects the request as if the delivery does not exist

### Requirement: Dashboard exposes retry progress and attempt history
The dashboard SHALL display `PROCESSING` and `RETRYING` delivery states, the next-attempt time when scheduled, and an attempt timeline containing each attempt's number, outcome, HTTP status or safe error, duration, and timestamp. Until real-time updates are introduced, views containing non-terminal deliveries SHALL refresh periodically.

#### Scenario: Delivery is waiting to retry
- **WHEN** a user views an event containing a `RETRYING` delivery
- **THEN** the dashboard shows the retrying state, completed-attempt count, and scheduled next-attempt time

#### Scenario: User inspects attempt history
- **WHEN** a user expands or opens a delivery with recorded attempts
- **THEN** the dashboard shows those attempts chronologically with their safe diagnostic information

#### Scenario: Retry completes while view is open
- **WHEN** a displayed delivery is non-terminal and changes state on the server
- **THEN** periodic refresh eventually updates its state and attempt timeline without a full page reload
