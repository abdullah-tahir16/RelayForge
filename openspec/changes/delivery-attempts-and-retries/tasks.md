## 1. Kafka Contracts and Retry Configuration

- [x] 1.1 Add delivery-job v2 contract fields for stable job identity, attempt number, and scheduled time while retaining a parser/normalizer for v1 jobs as attempt 1
- [x] 1.2 Add the version-1 scheduled-retry message contract and constants for the four staged retry topics and retry consumer group
- [x] 1.3 Add worker configuration for retry delays/attempt limit, processing-lease duration, response-preview limit, and sensitive-header denylist with production defaults and startup validation
- [x] 1.4 Extend delivery-worker environment examples with the retry and diagnostic configuration

## 2. Database Schema and Backfill

- [x] 2.1 Add a backend-owned migration that creates `delivery_attempts` with diagnostic fields, timestamps, foreign key, `(delivery_id, attempt_number)` uniqueness, and lookup index
- [x] 2.2 Extend the Delivery status enum with `PROCESSING` and `RETRYING` and add `next_attempt_at`, `processing_token`, and `processing_expires_at` columns/indexes
- [x] 2.3 Backfill one sparse attempt for each existing Delivery with `attempt_count > 0` without retrying or changing existing terminal outcomes
- [x] 2.4 Add matching TypeORM DeliveryAttempt and updated Delivery entities in `apps/backend`
- [x] 2.5 Verify migration up/down behavior on a database containing existing pending, succeeded, and failed deliveries

## 3. Attempt Claiming and State Transitions

- [x] 3.1 Replace the worker's read-before-send status check with a transactional conditional claim keyed by delivery id, expected attempt number, processing token, and expiry
- [x] 3.2 Insert or resume the unique Delivery Attempt row when a claim succeeds and distinguish claimed, active-duplicate, completed-duplicate, terminal, and not-yet-due outcomes
- [x] 3.3 Implement token-guarded successful completion that finalizes the attempt, increments `attempt_count`, updates Delivery summary fields, clears scheduling/ownership, and sets `SUCCEEDED`
- [x] 3.4 Implement token-guarded failed completion that finalizes diagnostics and atomically sets either `RETRYING` with `next_attempt_at` or exhausted terminal `FAILED`
- [x] 3.5 Add stale-processing ownership recovery while preserving one logical attempt row and documenting the possible at-least-once resend

## 4. Safe Webhook Diagnostics

- [x] 4.1 Extend the webhook sender result to capture response status, headers, a bounded body preview, duration inputs, and normalized timeout/DNS/connection/TLS errors
- [x] 4.2 Implement case-insensitive request/response header redaction using the configured denylist before any attempt metadata is persisted
- [x] 4.3 Bound response-body reads to the configured preview size and sanitize stored error messages so request secrets cannot leak
- [x] 4.4 Update the webhook request builder/consumer boundary so redacted request headers and complete safe outcomes reach attempt persistence

## 5. Retry Topic Pipeline

- [x] 5.1 Bootstrap the four retry topics through the existing delivery-worker Kafka topic service
- [x] 5.2 Add a retry publisher that selects the stage from the completed attempt, publishes the next versioned job keyed by project, and includes `notBefore`
- [x] 5.3 Add a retry consumer for all stages that republishes due jobs to `relayforge.deliveries` and commits the retry offset only after publishing succeeds
- [x] 5.4 Implement future-job partition pause/seek/resume behavior without sleeping inside the Kafka handler, including shutdown-safe timer cleanup
- [x] 5.5 Update the delivery consumer to normalize v1/v2 jobs, claim the expected attempt, persist outcomes, publish scheduled retries before committing, and acknowledge harmless duplicates
- [x] 5.6 Update event-status aggregation so `PENDING`, `PROCESSING`, and `RETRYING` keep an Event non-terminal until every Delivery is `SUCCEEDED` or exhausted `FAILED`

## 6. Attempt History API

- [x] 6.1 Add attempt response DTOs containing only persisted redacted diagnostics
- [x] 6.2 Add `GetDeliveryAttemptsQuery` and handler ordered by attempt number with Delivery → Event → Project workspace authorization
- [x] 6.3 Expose authenticated `GET /api/v1/deliveries/:deliveryId/attempts`, returning not-found semantics for another workspace's delivery
- [x] 6.4 Update Delivery list/detail response typing for `PROCESSING`, `RETRYING`, and `nextAttemptAt` without breaking existing filters

## 7. Dashboard Retry Experience

- [x] 7.1 Extend frontend Delivery types and status presentation for `PROCESSING`, `RETRYING`, attempt count, and next-attempt time
- [x] 7.2 Add the pure attempt-history API call and one TanStack Query hook following the existing infrastructure structure
- [x] 7.3 Add an on-demand attempt timeline/inspector to the event-delivery view with status/HTTP-or-error/duration/timestamp fields
- [x] 7.4 Poll event/delivery and open attempt queries only while displayed deliveries are non-terminal, stopping after resolution
- [x] 7.5 Verify the timeline remains readable at narrow viewport widths and exposes loading, empty, and error states

## 8. Unit and Integration Tests

- [x] 8.1 Unit test retry-policy parsing and stage selection for defaults, custom schedules, invalid configuration, and final-attempt exhaustion
- [x] 8.2 Unit test case-insensitive header redaction, bounded body previews, and normalized transport errors
- [x] 8.3 Integration test atomic claims and duplicate v1/v2 delivery jobs so one active/completed attempt cannot be sent concurrently or recorded twice
- [x] 8.4 Integration test a fail-then-success flow with accelerated delays, asserting attempt rows, state transitions, next-attempt timing, and final Event aggregation
- [x] 8.5 Integration test five exhausted attempts, asserting terminal `FAILED`, no additional scheduled job, and five immutable attempt rows
- [x] 8.6 Integration test retry-topic duplicate delivery, future `notBefore`, partition resume, worker restart, and publish-before-offset-commit behavior
- [x] 8.7 E2E test attempt-history workspace isolation, ordering, and redacted diagnostic responses
- [x] 8.8 Add frontend tests for retry status, next-attempt display, attempt timeline, and non-terminal polling shutdown

## 9. Verification and Documentation

- [x] 9.1 Run backend/worker/frontend lint, typecheck, unit tests, relevant integration/E2E tests, and production builds
- [x] 9.2 Exercise the full flow against Docker Compose with a destination that fails before succeeding and inspect retry topics plus persisted attempts
- [x] 9.3 Exercise an always-failing destination through exhaustion with accelerated local delays and confirm no DLQ/replay behavior is introduced yet
- [x] 9.4 Document retry defaults, operator configuration, attempt diagnostics/redaction, and the at-least-once crash window in the project documentation/LLM context as appropriate
- [x] 9.5 Run `openspec validate delivery-attempts-and-retries --strict` and resolve every reported issue
