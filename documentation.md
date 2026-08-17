# RelayForge — Webhook Relay & Delivery Platform

## 1. Purpose

RelayForge is a self-hostable webhook relay and asynchronous event delivery platform.

Applications send events to RelayForge through a simple HTTP API. RelayForge accepts the event immediately, publishes it to Kafka, and asynchronously delivers it to one or more registered webhook endpoints.

The platform provides developers with:

* Reliable webhook delivery
* Kafka-backed asynchronous processing
* Retry handling
* Dead-letter handling
* Delivery history
* Payload inspection
* Manual replay
* Endpoint management
* Webhook signing
* Real-time delivery logs
* Team collaboration
* Delivery analytics

The software should remain intentionally smaller than platforms such as Hookdeck or Svix while still being useful as a real self-hosted service.

---

# 2. Primary Goal

A client application should be able to send:

```http
POST /api/v1/events
```

with:

```json
{
  "event": "order.completed",
  "data": {
    "orderId": "ORD-123",
    "amount": 125.5
  }
}
```

RelayForge should:

```text
Receive Event
      ↓
Validate API Key
      ↓
Persist Event
      ↓
Publish to Kafka
      ↓
Return HTTP 202
      ↓
Kafka Consumer
      ↓
Resolve Subscriptions
      ↓
Deliver Webhooks
      ↓
Success / Retry / DLQ
```

The caller should not have to wait for the destination webhook endpoint to respond.

---

# 3. Technology Stack

## Frontend

```text
React
TypeScript
Material UI
TanStack Query
React Final Form
Zod
React Router
Axios
Socket.IO Client
```

## Backend

```text
NestJS
TypeScript
NestJS CQRS
PostgreSQL
Apache Kafka
WebSockets / Socket.IO
Swagger / OpenAPI
```

## Infrastructure

```text
Docker
Docker Compose
Kafka
PostgreSQL
GitHub Actions
```

Redis should not initially be required unless a genuine use case appears.

Kafka should handle the event-delivery pipeline rather than introducing Redis/BullMQ for the same responsibility.

---

# 4. Product Model

RelayForge is primarily a developer tool.

Main concepts:

```text
Workspace
   │
   └── Project
        │
        ├── API Keys
        ├── Endpoints
        ├── Subscriptions
        └── Events
              │
              └── Deliveries
                    │
                    └── Delivery Attempts
```

---

# 5. Main User Workflow

A developer should be able to:

1. Create an account.
2. Create a project.
3. Create an API key.
4. Register a webhook endpoint.
5. Subscribe the endpoint to event types.
6. Send an event to RelayForge.
7. See the event appear in the dashboard.
8. Watch delivery status update in real time.
9. Inspect every delivery attempt.
10. Retry a failed delivery.
11. Inspect dead-lettered events.

---

# 6. Example Scenario

A commerce application has:

```text
order.created
order.completed
order.cancelled
```

Two external systems want these events.

### Analytics

```text
https://analytics.example.com/webhooks
```

Subscriptions:

```text
order.*
```

### Fulfilment

```text
https://fulfilment.example.com/webhooks
```

Subscriptions:

```text
order.completed
```

When this event arrives:

```json
{
  "event": "order.completed",
  "data": {
    "orderId": "ORD-123"
  }
}
```

RelayForge generates:

```text
Event
│
├── Delivery → Analytics
│
└── Delivery → Fulfilment
```

Each delivery is independently retried and tracked.

---

# 7. Scope

The initial product must support:

* Authentication
* Workspaces
* Projects
* Team members
* API keys
* Webhook endpoints
* Event subscriptions
* Event ingestion
* Kafka publishing
* Kafka consumption
* Webhook delivery
* HMAC signatures
* Delivery retries
* Dead-letter queue
* Idempotency
* Event history
* Delivery history
* Delivery attempt history
* Event payload inspection
* Header inspection
* Manual replay
* Endpoint test delivery
* Real-time status updates
* Basic analytics
* Audit logs

---

# 8. Explicit Non-Goals

The first version must not attempt to become:

* A generic message broker
* Kafka management UI
* API gateway
* Workflow automation platform
* Zapier replacement
* Full integration platform
* Enterprise event bus
* Serverless function platform

Keeping the product small is a project requirement.

---

# 9. User Roles

Initial roles:

```text
OWNER
DEVELOPER
VIEWER
```

## OWNER

Can:

* Manage workspace
* Invite users
* Remove users
* Manage projects
* Manage API keys
* Manage endpoints
* Replay events
* Delete resources

## DEVELOPER

Can:

* View projects
* Create endpoints
* Modify endpoints
* View events
* Inspect deliveries
* Replay deliveries

## VIEWER

Can:

* View projects
* View endpoints
* View events
* View delivery history

Cannot modify data.

---

# 10. Workspaces

A workspace represents a team.

Fields:

```text
id
name
slug
createdBy
createdAt
updatedAt
```

Example:

```json
{
  "name": "Commerce Team",
  "slug": "commerce-team"
}
```

---

# 11. Projects

Projects isolate webhook configurations.

Example projects:

```text
E-Commerce
Billing
Internal Tools
Mobile Backend
```

Fields:

```text
id
workspaceId
name
key
description
createdAt
updatedAt
```

---

# 12. API Keys

Client applications authenticate when publishing events using API keys.

Example:

```text
rf_live_a9f83kd92...
```

API keys must:

* Belong to a project
* Have a name
* Be revocable
* Show creation date
* Show last-used date

Fields:

```text
id
projectId
name
keyHash
keyPrefix
createdAt
lastUsedAt
revokedAt
```

---

# 13. API Key Security

The full API key must only be shown once.

Store:

```text
SHA-256(key)
```

rather than plaintext.

Dashboard representation:

```text
Production Backend

rf_live_a9f8••••••••••
```

---

# 14. Webhook Endpoints

An endpoint represents an HTTP destination.

Fields:

```text
id
projectId
name
url
description
enabled
signingSecretHash
signingSecretEncrypted
timeoutMs
createdAt
updatedAt
disabledAt
```

Example:

```json
{
  "name": "Fulfilment Service",
  "url": "https://api.example.com/webhooks",
  "enabled": true,
  "timeoutMs": 10000
}
```

---

# 15. Endpoint URL Requirements

Webhook URLs must:

* Use HTTP or HTTPS
* Prefer HTTPS
* Be syntactically valid
* Reject obviously malformed URLs

Production configuration should optionally reject plain HTTP endpoints.

---

# 16. Endpoint State

Endpoint states:

```text
ACTIVE
DISABLED
```

A disabled endpoint must not receive new webhook deliveries.

Existing event history must remain available.

---

# 17. Event Types

Event types are strings.

Examples:

```text
order.created
order.updated
order.completed

customer.created

invoice.paid
invoice.failed
```

Recommended format:

```text
domain.action
```

The system should not hard-code allowed event names.

---

# 18. Event Subscriptions

Endpoints choose which events they receive.

Example:

```text
Fulfilment Endpoint

✓ order.completed
✓ order.cancelled
```

Subscription fields:

```text
id
endpointId
eventPattern
createdAt
```

---

# 19. Wildcard Subscriptions

Support:

```text
order.*
```

which matches:

```text
order.created
order.updated
order.completed
```

Also support:

```text
*
```

to receive all project events.

---

# 20. Event Ingestion API

Primary publishing endpoint:

```http
POST /api/v1/events
```

Headers:

```text
Authorization: Bearer <project-api-key>
Content-Type: application/json
Idempotency-Key: optional-client-key
```

Request:

```json
{
  "event": "order.completed",
  "data": {
    "orderId": "ORD-123",
    "amount": 125.5,
    "currency": "EUR"
  }
}
```

---

# 21. Event Response

The ingestion API should respond quickly.

Example:

```http
HTTP/1.1 202 Accepted
```

```json
{
  "id": "evt_01J...",
  "event": "order.completed",
  "status": "ACCEPTED",
  "createdAt": "2026-08-17T14:30:00Z"
}
```

The response must not wait for webhook destinations.

---

# 22. Event Entity

Fields:

```text
id
projectId
eventType
payload
metadata
idempotencyKey
status
createdAt
publishedAt
```

Statuses:

```text
ACCEPTED
PUBLISHED
PROCESSING
COMPLETED
PARTIALLY_FAILED
FAILED
```

---

# 23. Event Metadata

Optional client-provided metadata may include:

```json
{
  "source": "checkout-api",
  "correlationId": "abc-123"
}
```

Metadata must not influence routing unless explicitly supported.

---

# 24. Event Payload Limits

Initial configurable maximum:

```text
256 KB
```

Requests exceeding the configured payload limit must return:

```text
413 Payload Too Large
```

---

# 25. Kafka Architecture

Initial Kafka topics:

```text
relayforge.events
relayforge.deliveries
relayforge.delivery-results
relayforge.retry
relayforge.dlq
```

The exact topic design may evolve as Kafka knowledge improves.

---

# 26. Event Publishing Flow

```text
POST /events
      ↓
Event Command
      ↓
PostgreSQL
      ↓
Kafka Producer
      ↓
relayforge.events
```

Kafka message:

```json
{
  "eventId": "evt_123",
  "projectId": "project_123",
  "eventType": "order.completed",
  "createdAt": "..."
}
```

The full payload may either be included in Kafka or retrieved using `eventId`.

The initial implementation may include the payload directly for learning purposes.

---

# 27. Kafka Partitions

Kafka partitioning should preserve ordering where it matters.

Recommended event key:

```text
projectId
```

or optionally:

```text
projectId + orderingKey
```

Example:

```text
project_123:order_456
```

This allows related events to remain ordered within a partition.

---

# 28. Consumer Groups

Separate logical responsibilities should use separate consumer groups.

Example:

```text
relayforge-routing-consumers

relayforge-delivery-consumers

relayforge-analytics-consumers
```

This should demonstrate that different consumer groups can independently process the same event stream.

---

# 29. Routing Consumer

The routing consumer receives:

```text
relayforge.events
```

It must:

1. Load project subscriptions.
2. Identify matching endpoints.
3. Create one Delivery record per endpoint.
4. Publish individual delivery jobs.

Example:

```text
evt_123
   │
   ├── delivery_1
   ├── delivery_2
   └── delivery_3
```

---

# 30. Delivery Entity

Fields:

```text
id
eventId
endpointId
status
attemptCount
nextAttemptAt
completedAt
failedAt
createdAt
updatedAt
```

Statuses:

```text
PENDING
PROCESSING
SUCCEEDED
RETRYING
FAILED
DEAD_LETTERED
```

---

# 31. Delivery Consumer

The delivery consumer processes:

```text
relayforge.deliveries
```

Workflow:

```text
Delivery Message
      ↓
Load Event
      ↓
Load Endpoint
      ↓
Build Webhook Request
      ↓
Generate Signature
      ↓
HTTP POST
      ↓
Record Attempt
      ↓
Success or Failure
```

---

# 32. Webhook Request Format

RelayForge sends:

```http
POST /customer-webhook
Content-Type: application/json
X-RelayForge-Event: order.completed
X-RelayForge-Event-Id: evt_123
X-RelayForge-Delivery-Id: del_123
X-RelayForge-Timestamp: 1786977000
X-RelayForge-Signature: v1=...
```

Body:

```json
{
  "id": "evt_123",
  "event": "order.completed",
  "createdAt": "2026-08-17T14:30:00Z",
  "data": {
    "orderId": "ORD-123"
  }
}
```

---

# 33. Webhook Signatures

Each endpoint receives a signing secret.

RelayForge should use:

```text
HMAC SHA-256
```

Recommended signed input:

```text
timestamp.payload
```

Example:

```text
HMAC_SHA256(
  secret,
  timestamp + "." + rawPayload
)
```

Header:

```text
X-RelayForge-Signature:
v1=f88382...
```

---

# 34. Signature Verification Documentation

The project must provide examples showing clients how to verify signatures.

At minimum:

```text
Node.js
```

Future contributors can add:

```text
Python
Java
Go
PHP
C#
Rust
```

This provides a natural open-source contribution area.

---

# 35. Delivery Attempt

Every HTTP attempt must be stored separately.

Fields:

```text
id
deliveryId
attemptNumber
requestHeaders
responseStatus
responseHeaders
responseBodyPreview
durationMs
errorCode
errorMessage
startedAt
completedAt
```

Sensitive request headers must not be exposed unnecessarily.

---

# 36. Delivery Success

Any configurable successful HTTP response should count as delivered.

Default:

```text
200–299
```

Example:

```text
HTTP 204

Status:
SUCCEEDED
```

---

# 37. Delivery Failure

Examples:

```text
HTTP 400
HTTP 401
HTTP 404
HTTP 500
HTTP 503
Timeout
DNS error
Connection refused
TLS error
```

Failures must be recorded with useful diagnostic information.

---

# 38. Retry Policy

Initial retry policy:

```text
Attempt 1 → immediately

Attempt 2 → 30 seconds

Attempt 3 → 2 minutes

Attempt 4 → 10 minutes

Attempt 5 → 1 hour
```

After the final attempt:

```text
DEAD_LETTERED
```

Retry policy should eventually be configurable per project or endpoint.

---

# 39. Retry Architecture

Conceptually:

```text
Delivery Failure
      ↓
Retry Producer
      ↓
Kafka retry mechanism
      ↓
Delivery Consumer
```

Kafka itself does not provide arbitrary delayed message delivery.

Implementation may use:

* Retry topics with staged consumers
* Application-controlled scheduling
* Timestamp-based retry processing

The architecture should deliberately document the chosen approach because retry design is an important Kafka learning objective.

---

# 40. Retry Topics

One acceptable implementation:

```text
relayforge.retry.30s
relayforge.retry.2m
relayforge.retry.10m
relayforge.retry.1h
```

Flow:

```text
delivery
   ↓ fails
retry.30s
   ↓ fails
retry.2m
   ↓ fails
retry.10m
   ↓ fails
retry.1h
   ↓ fails
DLQ
```

---

# 41. Dead-Letter Queue

Events that exhaust retries must be published to:

```text
relayforge.dlq
```

The corresponding delivery becomes:

```text
DEAD_LETTERED
```

The dashboard must provide a dedicated DLQ view.

---

# 42. DLQ Screen

Display:

```text
Event
Endpoint
Failure Reason
Attempts
Last Attempt
Created
```

Actions:

```text
Inspect
Replay
Disable Endpoint
```

---

# 43. Manual Replay

Users must be able to replay:

* A single failed delivery
* A successful delivery
* All failed deliveries for an event

Replay must create a **new delivery attempt lifecycle** while maintaining auditability.

---

# 44. Replay Semantics

Replay should not modify historical attempts.

Example:

```text
Original Delivery

Attempt 1 FAILED
Attempt 2 FAILED
Attempt 3 DEAD_LETTERED

User clicks Replay

Attempt 4 PROCESSING
Attempt 4 SUCCEEDED
```

Alternatively, a new replay delivery record may reference the original.

Either approach must preserve history.

---

# 45. Idempotency

The ingestion API should support:

```text
Idempotency-Key
```

Example:

```text
Idempotency-Key: order-123-completed
```

If the same key is submitted again for the same project within the configured retention period, RelayForge must not create a duplicate logical event.

---

# 46. Idempotency Response

If the original event already exists:

```json
{
  "id": "evt_existing",
  "duplicate": true
}
```

---

# 47. Consumer Idempotency

Kafka consumers must also be designed with duplicate processing in mind.

Before creating a duplicate delivery, consumers should verify whether:

```text
eventId + endpointId
```

has already generated a delivery.

Database constraints should reinforce this where appropriate.

---

# 48. At-Least-Once Delivery

RelayForge should explicitly document that Kafka and webhook delivery are designed around:

```text
at-least-once delivery
```

Therefore downstream consumers must be encouraged to implement idempotent webhook handlers.

Exactly-once webhook delivery must not be promised.

---

# 49. Endpoint Testing

Users must be able to click:

```text
Send Test Event
```

Example payload:

```json
{
  "event": "relayforge.test",
  "data": {
    "message": "Hello from RelayForge"
  }
}
```

The test should go through the same delivery pipeline where practical.

---

# 50. Event Dashboard

Primary event table:

```text
EVENT                STATUS          DELIVERIES

order.completed      Completed       3/3
invoice.failed       Partial         1/2
customer.created     Failed          0/1
```

Columns:

```text
Event Type
Event ID
Status
Created At
Delivery Count
Success Count
Failure Count
```

---

# 51. Event Detail

Display:

```text
Event ID
Event Type
Created At
Project
Metadata
Payload
```

Sections:

```text
Payload
Deliveries
Timeline
```

---

# 52. JSON Payload Viewer

Payload viewer should provide:

* Pretty formatting
* Expand/collapse
* Copy payload
* Search within JSON
* Raw JSON view

Large payloads should not freeze the UI.

---

# 53. Delivery Detail

Display:

```text
Endpoint
Status
Attempts
Duration
Last Response
Next Retry
```

Timeline example:

```text
14:30:01 Attempt 1
503 Service Unavailable

14:30:31 Attempt 2
503 Service Unavailable

14:32:31 Attempt 3
200 OK
```

---

# 54. HTTP Inspector

Every delivery attempt should allow developers to inspect:

### Request

```text
URL
Method
Headers
Body
Timestamp
```

### Response

```text
HTTP Status
Headers
Response Preview
Duration
```

Secrets must be redacted where appropriate.

---

# 55. Real-Time Updates

WebSockets should update the UI for:

```text
event.created
event.updated

delivery.created
delivery.processing
delivery.succeeded
delivery.failed
delivery.retrying
delivery.dead_lettered
```

Users should not need to refresh the page to observe active deliveries.

---

# 56. Endpoint Dashboard

Endpoint list example:

```text
Fulfilment API       ACTIVE
Last delivery: 2m ago
Success rate: 99.8%

Analytics            ACTIVE
Last delivery: 5s ago
Success rate: 96.4%
```

---

# 57. Endpoint Detail

Sections:

```text
Configuration
Subscriptions
Deliveries
Statistics
Signing Secret
```

---

# 58. Basic Analytics

Project dashboard should show:

```text
Events Today

Deliveries Today

Successful Deliveries

Failed Deliveries

Success Rate

Average Delivery Latency

DLQ Count
```

---

# 59. Endpoint Analytics

Example:

```text
Fulfilment Service

Deliveries:         12,430
Successful:         12,391
Failed:                 39
Success Rate:         99.69%
Average Latency:       182ms
```

---

# 60. Search

Users should be able to search events using:

```text
Event ID
Event Type
Endpoint
Correlation ID
```

Full arbitrary JSON search is not required for the first release.

---

# 61. Filters

Event filters:

```text
Event Type
Status
Created Date
Endpoint
```

Delivery filters:

```text
Status
Endpoint
HTTP Status
Date
```

---

# 62. Retention

Event and delivery history should have configurable retention eventually.

Initial default:

```text
30 days
```

MVP may retain everything for simplicity.

---

# 63. Audit Log

Important administrative actions must be recorded.

Examples:

```text
PROJECT_CREATED
API_KEY_CREATED
API_KEY_REVOKED
ENDPOINT_CREATED
ENDPOINT_UPDATED
ENDPOINT_DISABLED
SIGNING_SECRET_ROTATED
EVENT_REPLAYED
DELIVERY_REPLAYED
MEMBER_INVITED
MEMBER_REMOVED
```

Fields:

```text
id
workspaceId
actorId
action
entityType
entityId
metadata
createdAt
```

---

# 64. Authentication

Required endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Use:

```text
Argon2
JWT
Refresh Token Rotation
```

---

# 65. Project APIs

```text
GET    /api/v1/projects
POST   /api/v1/projects

GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id
```

---

# 66. API Key APIs

```text
GET    /api/v1/projects/:projectId/api-keys
POST   /api/v1/projects/:projectId/api-keys
DELETE /api/v1/api-keys/:id
```

---

# 67. Endpoint APIs

```text
GET    /api/v1/projects/:projectId/endpoints
POST   /api/v1/projects/:projectId/endpoints

GET    /api/v1/endpoints/:id
PATCH  /api/v1/endpoints/:id
DELETE /api/v1/endpoints/:id

POST   /api/v1/endpoints/:id/enable
POST   /api/v1/endpoints/:id/disable
POST   /api/v1/endpoints/:id/test
```

---

# 68. Subscription APIs

```text
GET    /api/v1/endpoints/:id/subscriptions
POST   /api/v1/endpoints/:id/subscriptions
DELETE /api/v1/subscriptions/:id
```

---

# 69. Event APIs

Publisher API:

```text
POST /api/v1/events
```

Dashboard APIs:

```text
GET /api/v1/projects/:projectId/events
GET /api/v1/events/:id
```

Replay:

```text
POST /api/v1/events/:id/replay
```

---

# 70. Delivery APIs

```text
GET /api/v1/events/:eventId/deliveries

GET /api/v1/deliveries/:id

GET /api/v1/deliveries/:id/attempts

POST /api/v1/deliveries/:id/replay
```

---

# 71. DLQ APIs

```text
GET /api/v1/projects/:projectId/dlq

POST /api/v1/deliveries/:id/replay
```

---

# 72. Standard Error Response

Example:

```json
{
  "statusCode": 404,
  "code": "ENDPOINT_NOT_FOUND",
  "message": "Webhook endpoint was not found.",
  "timestamp": "2026-08-17T14:30:00Z",
  "requestId": "..."
}
```

---

# 73. NestJS CQRS

The backend must use:

```text
Commands
Queries
Events
```

for meaningful application workflows.

---

# 74. Example Commands

```text
CreateProjectCommand
CreateApiKeyCommand

CreateEndpointCommand
UpdateEndpointCommand
DisableEndpointCommand
RotateSigningSecretCommand

PublishEventCommand

CreateDeliveryCommand
ProcessDeliveryCommand
MarkDeliverySucceededCommand
MarkDeliveryFailedCommand
ReplayDeliveryCommand
```

---

# 75. Example Queries

```text
GetProjectsQuery
GetProjectQuery

GetEndpointsQuery
GetEndpointQuery

GetEventsQuery
GetEventQuery

GetDeliveryQuery
GetDeliveryAttemptsQuery

GetDlqQuery
GetProjectAnalyticsQuery
```

---

# 76. Application Events

Examples:

```text
EventAcceptedEvent
EventPublishedEvent

DeliveryCreatedEvent
DeliveryStartedEvent
DeliverySucceededEvent
DeliveryFailedEvent
DeliveryDeadLetteredEvent

EndpointDisabledEvent
```

---

# 77. Backend Module Structure

Example:

```text
src/
├── auth/
├── workspaces/
├── projects/
├── api-keys/
├── endpoints/
├── subscriptions/
├── events/
├── deliveries/
├── analytics/
├── audit/
├── kafka/
├── websocket/
└── common/
```

Individual modules should follow CQRS organization.

Example:

```text
deliveries/
├── commands/
│   ├── impl/
│   └── handlers/
├── queries/
│   ├── impl/
│   └── handlers/
├── events/
│   ├── impl/
│   └── handlers/
├── dto/
├── entities/
├── repositories/
├── services/
├── deliveries.controller.ts
└── deliveries.module.ts
```

---

# 78. Kafka Module

Dedicated:

```text
src/kafka/
```

should contain infrastructure concerns such as:

```text
Kafka configuration
Producer service
Consumer setup
Topic definitions
Serialization
Message headers
Consumer lifecycle
```

Kafka infrastructure must not contain domain business rules.

---

# 79. Kafka Message Envelope

All internal Kafka messages should follow a consistent envelope.

Example:

```json
{
  "id": "msg_123",
  "type": "webhook.delivery.requested",
  "version": 1,
  "occurredAt": "2026-08-17T14:30:00Z",
  "correlationId": "corr_123",
  "data": {}
}
```

---

# 80. Schema Versioning

Kafka messages should contain:

```text
version
```

This allows future message evolution.

Example:

```json
{
  "type": "webhook.delivery.requested",
  "version": 1
}
```

---

# 81. Kafka Learning Objectives

The project should deliberately demonstrate:

```text
Producers
Consumers
Topics
Partitions
Message keys
Consumer groups
Offsets
Acknowledgements
Retries
DLQ
Ordering
Idempotent consumers
At-least-once processing
Consumer scaling
Rebalancing
Message versioning
```

These concepts should be documented in the project architecture.

---

# 82. Kafka Observability

Developer/debug view should expose useful Kafka information where practical:

```text
Topic
Partition
Offset
Consumer Group
Processing timestamp
```

This information does not necessarily need to be shown to normal users.

---

# 83. Frontend Architecture

Use the previously defined strict frontend structure:

```text
src/
├── core/
├── infrastructure/
└── presentation/
```

---

# 84. Core Types

Example:

```text
src/core/types/Event/
├── types.ts
└── index.ts

src/core/types/Endpoint/
├── types.ts
└── index.ts

src/core/types/Delivery/
├── types.ts
└── index.ts
```

Expected domains:

```text
Workspace
Project
ApiKey
Endpoint
Subscription
Event
Delivery
DeliveryAttempt
AuditLog
Analytics
```

---

# 85. API Layer

Example:

```text
infrastructure/api/Event/
├── index.ts
└── types.ts
```

API files must contain pure HTTP calls only.

---

# 86. TanStack Query Hooks

One query or mutation per file.

Example:

```text
infrastructure/hooks/Event/

useGetEvents.ts
useGetEvent.ts
useReplayEvent.ts
```

Endpoint example:

```text
useGetEndpoints.ts
useCreateEndpoint.ts
useUpdateEndpoint.ts
useTestEndpoint.ts
```

---

# 87. Use Cases

Example:

```text
infrastructure/useCases/Event/
useEventUseCase.ts
```

```text
infrastructure/useCases/Endpoint/
useEndpointUseCase.ts
```

Use cases contain business orchestration only.

---

# 88. Presentation Containers

Example:

```text
presentation/containers/Events/index.tsx

presentation/containers/Endpoint/index.tsx

presentation/containers/Delivery/index.tsx
```

Containers remain render-only.

---

# 89. Presentation Hooks

Example:

```text
presentation/hooks/Events/useEventsFeature.ts

presentation/hooks/Endpoint/useEndpointFeature.ts

presentation/hooks/Delivery/useDeliveryFeature.ts
```

These contain:

```text
filters
pagination
modal state
selected rows
handlers
derived view data
navigation
transient UI state
```

---

# 90. Presentation Components

Example:

```text
presentation/components/Events/
├── index.tsx
├── Header/
├── Filters/
├── Table/
├── Payload/
└── ReplayModal/
```

---

# 91. Material UI

Material UI must be used as the frontend component system.

Direct use of common MUI input components inside features should be avoided.

Use shared wrappers.

---

# 92. Shared UI Wrappers

Examples:

```text
AppButton
AppIconButton
AppTextField
AppSelect
AppCheckbox
AppAutocomplete
AppDialog
AppTable
AppChip
AppAlert
AppSnackbar
AppLoader
AppSkeleton
AppConfirmDialog
```

Dependency:

```text
Material UI
     ↓
App Wrappers
     ↓
Feature UI
```

---

# 93. React Final Form

Forms must use:

```text
React Final Form
```

with:

```text
Zod
```

for validation.

---

# 94. Form Wrappers

Feature forms must use:

```text
FormTextField
FormTextArea
FormSelect
FormCheckbox
FormAutocomplete
FormNumberField
```

rather than raw:

```text
<Field>
<TextField>
```

combinations.

---

# 95. Unified Theme

All colors and application-level styling should originate from one centralized Material UI theme.

Changing:

```text
primary.main
```

must update application-wide primary styling.

Avoid hard-coded colors in features except data-specific semantic colors.

---

# 96. Main Navigation

Sidebar:

```text
Overview

Events

Endpoints

Dead Letter Queue

API Keys

Team

Settings
```

---

# 97. Overview Dashboard

Display:

```text
Events Today

Deliveries Today

Success Rate

Failed Deliveries

DLQ Events

Average Delivery Time
```

Recent activity:

```text
order.completed
3/3 delivered

invoice.failed
1 delivery retrying

customer.created
dead-lettered
```

---

# 98. Events Screen

Table:

```text
Event             Created        Status        Deliveries

order.completed   15:24:01       Success       2/2
invoice.failed    15:23:41       Retrying      0/1
customer.created  15:20:33       Partial       1/2
```

---

# 99. Endpoint Form

Fields:

```text
Name *
URL *
Description
Timeout
Enabled

Subscriptions
```

Zod should validate:

```text
name
URL
timeout range
```

---

# 100. Test Endpoint Experience

When user clicks:

```text
Send Test
```

UI should display live:

```text
Sending...
      ↓
Delivered

HTTP 200
182 ms
```

or:

```text
Failed

HTTP 500

[Inspect Attempt]
```

---

# 101. Security

Implement:

```text
Argon2 password hashing
JWT authentication
Refresh-token rotation
Hashed API keys
Encrypted endpoint signing secrets
RBAC
Tenant/workspace isolation
Rate limiting
Input validation
Secure HTTP headers
CORS
SSRF protection
Audit logging
```

---

# 102. SSRF Protection

This project accepts arbitrary webhook URLs, making SSRF a major security concern.

The backend must protect against destinations such as:

```text
127.0.0.1
localhost
169.254.169.254
private network ranges
internal DNS targets
```

unless specifically allowed in trusted self-hosted configuration.

The system must validate the resolved destination before sending HTTP requests.

---

# 103. Redirect Security

HTTP redirects must not be blindly followed.

A permitted public URL must not be allowed to redirect into:

```text
localhost
private network
cloud metadata services
```

Each redirect destination must be validated.

---

# 104. Sensitive Header Redaction

Do not expose:

```text
Authorization
Cookie
Set-Cookie
```

or other configured secrets in ordinary logs.

Dashboard displays should redact sensitive values.

---

# 105. Rate Limiting

Example:

Event ingestion:

```text
1,000 events/minute/API key
```

Management APIs:

```text
300 requests/minute/user
```

Authentication:

```text
10 attempts/minute/IP
```

Limits must be configurable.

---

# 106. PostgreSQL Tables

Core tables:

```text
users
workspaces
workspace_members

projects
api_keys

endpoints
subscriptions

events
deliveries
delivery_attempts

audit_logs
```

---

# 107. Important Constraints

Examples:

```text
UNIQUE(project_id, idempotency_key)

UNIQUE(event_id, endpoint_id)
```

where appropriate.

---

# 108. Database Indexes

Important indexes:

```text
events(project_id, created_at)

events(project_id, event_type)

deliveries(event_id)

deliveries(endpoint_id, created_at)

deliveries(status)

delivery_attempts(delivery_id)

subscriptions(endpoint_id)
```

---

# 109. Event Persistence

The event must be durably stored before acknowledging acceptance or the architecture must use an equivalent reliable pattern.

A dangerous flow would be:

```text
Publish Kafka
   ↓
return 202
   ↓
database write fails
```

without recovery.

---

# 110. Transactional Outbox — Advanced Phase

A later version should introduce the **Transactional Outbox Pattern**.

Flow:

```text
Database Transaction
   │
   ├── Save Event
   └── Save Outbox Record

Commit
   ↓
Outbox Publisher
   ↓
Kafka
```

This is strongly recommended as a later Kafka-learning phase.

---

# 111. Outbox Table

Potential fields:

```text
id
aggregateType
aggregateId
eventType
payload
status
createdAt
publishedAt
```

---

# 112. Consumer Failure Handling

If a consumer crashes after processing but before committing an offset, the message may be processed again.

Therefore handlers must be idempotent.

The architecture must explicitly account for this instead of assuming messages are processed exactly once.

---

# 113. Delivery Timeout

Default:

```text
10 seconds
```

Maximum configurable endpoint timeout:

```text
30 seconds
```

A destination taking longer should be treated as failed.

---

# 114. Concurrency

Delivery workers should process multiple deliveries concurrently.

Concurrency must be configurable.

Example:

```text
DELIVERY_CONCURRENCY=20
```

Kafka partitions should constrain effective parallelism.

---

# 115. Graceful Shutdown

Kafka consumers must:

1. Stop accepting new work.
2. Finish or safely abort active deliveries.
3. Commit appropriate offsets.
4. Disconnect cleanly.

NestJS shutdown hooks must be enabled.

---

# 116. Health Checks

Expose:

```text
GET /health
GET /health/live
GET /health/ready
```

Readiness should verify:

```text
PostgreSQL
Kafka connectivity
```

---

# 117. Structured Logging

Example:

```json
{
  "level": "info",
  "message": "Webhook delivered",
  "eventId": "evt_123",
  "deliveryId": "del_123",
  "endpointId": "end_123",
  "attempt": 2,
  "statusCode": 200,
  "durationMs": 184,
  "requestId": "req_123"
}
```

---

# 118. Correlation IDs

Propagate:

```text
requestId
correlationId
eventId
deliveryId
```

through HTTP, Kafka, and logs where applicable.

---

# 119. Swagger

API documentation must be available at:

```text
/api/docs
```

It should include examples for event publishing.

---

# 120. Docker Compose

Development environment:

```text
frontend
api
delivery-worker
postgres
kafka
```

Optionally:

```text
kafka-ui
```

for local development and learning.

---

# 121. Service Separation

Initial backend can be developed as:

```text
API Service

Delivery Worker
```

both using NestJS.

Do not split into ten microservices.

The initial architecture:

```text
React
  ↓
NestJS API
  ↓
Kafka
  ↓
NestJS Worker
```

is sufficient.

---

# 122. Repository Structure

Recommended:

```text
relayforge/
│
├── apps/
│   ├── web/
│   ├── api/
│   └── delivery-worker/
│
├── packages/
│   ├── kafka-contracts/
│   └── shared-config/
│
├── docs/
│   ├── architecture/
│   └── adr/
│
├── docker-compose.yml
├── README.md
└── package.json
```

---

# 123. Shared Kafka Contracts

A package such as:

```text
packages/kafka-contracts
```

may contain stable internal message contracts.

Example:

```typescript
interface DeliveryRequestedMessage {
  id: string;
  version: 1;
  eventId: string;
  deliveryId: string;
  occurredAt: string;
}
```

This is different from directly sharing database entities.

---

# 124. Testing

Use:

```text
Jest
Supertest
Playwright
```

Kafka integration tests should use an actual Kafka instance through Docker/Testcontainers where possible.

---

# 125. Unit Tests

Important unit cases:

```text
Wildcard subscription matching

HMAC generation

Signature verification helper

Retry calculation

Endpoint validation

SSRF URL validation

Idempotency

Event routing

Delivery status transitions
```

---

# 126. Integration Tests

Test:

```text
PostgreSQL

Kafka producer

Kafka consumer

Event routing

Delivery worker

Retries

DLQ

API authentication
```

---

# 127. E2E Scenario

Example:

```text
Create Account

Create Project

Create Endpoint

Subscribe to order.completed

Create API Key

POST order.completed

Kafka receives event

Routing consumer creates delivery

Delivery worker calls endpoint

Endpoint returns 200

Dashboard displays success
```

---

# 128. Failure E2E Scenario

```text
Publish Event

Endpoint returns 500

Attempt 1 fails

Retry scheduled

Endpoint continues failing

Maximum retries exhausted

Delivery enters DLQ

User opens DLQ

User clicks Replay

Endpoint returns 200

Delivery succeeds
```

---

# 129. CI/CD

Pull requests should run:

```text
Install
Lint
Typecheck
Unit Tests
Integration Tests
Frontend Build
API Build
Worker Build
Docker Build
```

---

# 130. README

README should immediately explain:

```text
RelayForge

Open-source Kafka-backed webhook relay and delivery platform.
```

Then include:

* Screenshot
* Features
* Architecture diagram
* Quick start
* Event publishing example
* Webhook verification example
* Kafka architecture
* Retry model
* Local development
* Contribution guide
* Roadmap

---

# 131. Open-Source Collaboration Model

The project should deliberately expose areas where contributors can add functionality without rewriting the core.

Good contribution areas:

```text
Signature verification examples

Kafka serializers

Authentication strategies

Observability integrations

Webhook templates

SDKs

Language examples

Docker deployment improvements

Retry strategies

Notification integrations
```

---

# 132. SDK Opportunity

Future packages:

```text
@relayforge/node
@relayforge/react
```

Node example:

```typescript
const relayForge = new RelayForge({
  apiKey: process.env.RELAYFORGE_API_KEY,
});

await relayForge.publish("order.completed", {
  orderId: "ORD-123",
});
```

SDKs are optional and should not block MVP.

---

# 133. CLI Opportunity

Future:

```bash
relayforge events send order.completed payload.json

relayforge events list

relayforge deliveries replay del_123

relayforge endpoints list
```

---

# 134. MVP — v0.1

Build only:

```text
Authentication

Projects

API Keys

Endpoints

Subscriptions

Event Publishing

Kafka Producer

Kafka Consumer

Webhook Delivery

Delivery History

Basic Dashboard
```

No retry system initially.

The first Kafka milestone should simply prove:

```text
HTTP Event
   ↓
Kafka
   ↓
Consumer
   ↓
Webhook
```

---

# 135. v0.2

Add:

```text
Delivery Attempts

Retries

Retry Topics

DLQ

Manual Replay
```

---

# 136. v0.3

Add:

```text
HMAC Signatures

Signing Secret Rotation

Endpoint Testing

Idempotency

SSRF Protection
```

---

# 137. v0.4

Add:

```text
Real-Time WebSockets

Analytics

Event Search

Filters

Audit Logs
```

---

# 138. v0.5

Add:

```text
Transactional Outbox

Improved Kafka Reliability

Consumer Metrics

Correlation IDs

Message Versioning
```

---

# 139. v1.0

Version 1.0 should include:

```text
Stable Event API

Stable Kafka Contracts

Reliable Delivery

Retries

DLQ

Replay

HMAC Signing

Idempotency

Team Workspaces

Real-Time Dashboard

Security Controls

Docker Deployment

Swagger

Tests

Documentation
```

---

# 140. Features That Must Not Be Added Before v1

To prevent scope explosion, avoid initially adding:

```text
Billing
Subscriptions
OAuth integrations
Visual workflow builder
Transformations
Custom JavaScript execution
100 third-party integrations
Kafka administration
Complex dashboards
A/B testing
Event schema registry UI
Full API gateway behavior
```

---

# 141. Core Kafka Learning Path

The implementation should intentionally proceed in this order:

### Step 1

```text
Producer
→ Topic
→ Consumer
```

### Step 2

```text
Partitions
Consumer Groups
Multiple Workers
```

### Step 3

```text
Failure Handling
Retries
DLQ
```

### Step 4

```text
Idempotent Consumers
Offset Handling
Reprocessing
```

### Step 5

```text
Transactional Outbox
```

### Step 6

```text
Observability
Consumer Lag
Performance
```

This ensures Kafka is being learned rather than merely included as a dependency.

---

# 142. Definition of Done — MVP

The MVP is complete when this works:

```text
Developer creates endpoint

        ↓

https://example.com/webhook

        ↓

Subscribes endpoint to:

order.completed

        ↓

Developer sends:

POST /api/v1/events

{
  "event": "order.completed",
  "data": {
    "orderId": "123"
  }
}

        ↓

RelayForge returns:

202 Accepted

        ↓

Event appears in Kafka

        ↓

NestJS consumer receives it

        ↓

Delivery record created

        ↓

Webhook sent

        ↓

Destination responds HTTP 200

        ↓

Dashboard changes:

PENDING → PROCESSING → SUCCEEDED
```

A failed endpoint must ultimately support:

```text
PROCESSING
    ↓
FAILED
    ↓
RETRYING
    ↓
FAILED
    ↓
DEAD_LETTERED
    ↓
Manual Replay
    ↓
SUCCEEDED
```

That workflow represents the central value of RelayForge and the main technical purpose of the project.
