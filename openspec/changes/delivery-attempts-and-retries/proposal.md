## Why

RelayForge currently turns every webhook failure into an immediate terminal `FAILED` result and stores only the latest outcome on the Delivery row. The first Phase 2 reliability change must preserve an immutable history of each HTTP attempt and automatically retry failures on the documented backoff schedule before treating a delivery as exhausted.

## What Changes

- Add a Delivery Attempt record for every outbound webhook request, including attempt number, redacted request/response metadata, bounded response preview, duration, HTTP outcome or transport error, and timestamps.
- Expand the delivery lifecycle to `PENDING → PROCESSING → SUCCEEDED` or `RETRYING → PROCESSING`, with `FAILED` reserved for a delivery that exhausts all configured attempts.
- Apply the default five-attempt schedule from `documentation.md`: immediate, then after 30 seconds, 2 minutes, 10 minutes, and 1 hour. Make the schedule configurable for local development and tests while preserving those production defaults.
- Add staged Kafka retry topics and a retry consumer that durably holds failed jobs until their `notBefore` time, then republishes them to `relayforge.deliveries` without blocking a consumer handler for the delay duration.
- Make attempt claiming and completion idempotent so duplicate Kafka messages cannot create the same attempt twice or concurrently send two requests for one scheduled attempt.
- Add an authenticated, workspace-scoped API for listing a delivery's attempts, and expose attempt history plus `PROCESSING`/`RETRYING` states in the existing dashboard delivery experience.
- Keep DLQ publication, `DEAD_LETTERED`, and manual replay out of this change; `dead-letter-queue-and-replay` will build on the exhausted `FAILED` outcome.

## Capabilities

### New Capabilities
- `delivery-reliability`: Immutable delivery-attempt history, automatic staged retries, retry-safe state transitions, attempt-history access, and dashboard visibility.

### Modified Capabilities

(none) — the repository has no archived main capability specs yet; this change adds the Phase 2 reliability contract as a new capability while evolving the delivery behavior introduced by the completed, unarchived pipeline change.

## Impact

- Database: new `delivery_attempts` table; additional scheduling/state columns and enum values on `deliveries`; indexes and uniqueness constraints for due retries and attempt identity.
- Kafka: four staged retry topics and a versioned retry message contract in `packages/kafka-contracts`; delivery jobs gain explicit attempt identity/scheduling metadata.
- Worker: `apps/delivery-worker` gains atomic attempt claiming, richer HTTP outcome capture, retry scheduling/consumption, and exhausted-delivery aggregation.
- Backend/API: a workspace-isolated attempt-history query endpoint and DTOs.
- Frontend: delivery status handling and an attempt timeline/inspector in the existing event-delivery flow.
- Configuration/tests: configurable retry delays, response-preview bounds, retry-topic bootstrapping, unit/integration coverage, and accelerated test schedules.
