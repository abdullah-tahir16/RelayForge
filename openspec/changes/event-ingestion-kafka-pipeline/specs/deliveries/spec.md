## Purpose

Turns a published event into one webhook delivery per matching, enabled subscription, and tracks each delivery's outcome and the event's overall result.

## ADDED Requirements

### Requirement: Route a published event to matching, enabled subscriptions
The system SHALL, for each published event, identify every subscription belonging to the event's project whose pattern matches the event's type — an exact pattern must equal the event type; a wildcard pattern (`*`, or a pattern ending in `.*`) must match the corresponding prefix — and whose endpoint is enabled. The system SHALL create exactly one Delivery record per matching endpoint. A subscription belonging to a disabled endpoint SHALL NOT produce a Delivery.

#### Scenario: Event matches an exact-pattern subscription
- **WHEN** a published event's type exactly equals an enabled endpoint's subscription pattern
- **THEN** the system creates a Delivery record for that endpoint

#### Scenario: Event matches a wildcard subscription
- **WHEN** a published event's type matches an enabled endpoint's wildcard subscription pattern (e.g. `order.*` matching `order.completed`)
- **THEN** the system creates a Delivery record for that endpoint

#### Scenario: Disabled endpoint's subscription produces no delivery
- **WHEN** a published event's type matches a subscription belonging to a disabled endpoint
- **THEN** the system does not create a Delivery record for that endpoint

#### Scenario: No matching subscriptions
- **WHEN** a published event's type matches no enabled endpoint's subscription in its project
- **THEN** the system creates no Delivery records for that event

### Requirement: Routing does not create duplicate deliveries for the same event and endpoint
The system SHALL create at most one Delivery record per unique combination of event and endpoint, even if the same published-event message is processed more than once.

#### Scenario: Redelivered event message does not duplicate a delivery
- **WHEN** the routing consumer processes a message for an already-routed event a second time
- **THEN** the system does not create a second Delivery record for any endpoint that already has one for that event

### Requirement: Delivery consumer sends the documented webhook request
For each Delivery record, the system SHALL send an HTTP POST to the endpoint's URL, within the endpoint's configured timeout, containing the `X-RelayForge-Event`, `X-RelayForge-Event-Id`, `X-RelayForge-Delivery-Id`, and `X-RelayForge-Timestamp` headers and a JSON body containing the event's id, type, creation time, and data. The system SHALL mark the Delivery `SUCCEEDED` on any `2xx` response, and SHALL mark it `FAILED` on any non-`2xx` response, unreachable endpoint, or timeout.

#### Scenario: Successful delivery
- **WHEN** an endpoint responds with a `2xx` status to a delivery's webhook request
- **THEN** the system marks the Delivery `SUCCEEDED` and records its completion time

#### Scenario: Failed delivery — error response
- **WHEN** an endpoint responds with a non-`2xx` status to a delivery's webhook request
- **THEN** the system marks the Delivery `FAILED` and records its failure time

#### Scenario: Failed delivery — unreachable or timed out
- **WHEN** an endpoint is unreachable or does not respond within its configured timeout
- **THEN** the system marks the Delivery `FAILED` and records its failure time

### Requirement: Delivery consumer does not re-send a webhook for an already-resolved delivery
The system SHALL NOT send another webhook request for a Delivery record that is already `SUCCEEDED` or `FAILED`, even if its delivery-job message is processed more than once.

#### Scenario: Redelivered delivery-job message is skipped
- **WHEN** the delivery consumer processes a delivery-job message for a Delivery record already at status `SUCCEEDED` or `FAILED`
- **THEN** the system does not send another webhook request for that Delivery

### Requirement: Event status reflects the combined outcome of its deliveries
The system SHALL advance an event's status to `PROCESSING` once its deliveries have been created, and to a terminal status once every Delivery created for it has reached `SUCCEEDED` or `FAILED`: `COMPLETED` if every Delivery succeeded (including when there were none to create), `PARTIALLY_FAILED` if at least one succeeded and at least one failed, and `FAILED` if every Delivery failed.

#### Scenario: Event with no matching subscriptions completes immediately
- **WHEN** a published event matches no enabled subscription
- **THEN** the system marks the event `COMPLETED`

#### Scenario: All deliveries succeed
- **WHEN** every Delivery created for an event reaches `SUCCEEDED`
- **THEN** the system marks the event `COMPLETED`

#### Scenario: Mixed outcomes
- **WHEN** at least one Delivery created for an event reaches `SUCCEEDED` and at least one reaches `FAILED`
- **THEN** the system marks the event `PARTIALLY_FAILED`

#### Scenario: All deliveries fail
- **WHEN** every Delivery created for an event reaches `FAILED` and at least one Delivery was created
- **THEN** the system marks the event `FAILED`
