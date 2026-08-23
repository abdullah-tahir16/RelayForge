## Why

RelayForge now retries failed webhooks and preserves their attempts, but an exhausted delivery only stops at `FAILED`: operators have no durable dead-letter signal, dedicated failure queue, or safe way to retry after fixing an endpoint. Phase 2 needs to close that recovery loop without erasing the history established by the retry change.

## What Changes

- Publish every newly exhausted delivery run to `relayforge.dlq` using a versioned, secret-free message with stable identity, and expose `DEAD_LETTERED` as the terminal delivery state once its attempt budget is exhausted.
- Introduce explicit Delivery Runs beneath the existing logical Delivery. The initial run and every manual replay retain their own trigger, actor, status, attempt budget, counters, and timestamps while Delivery remains the latest-run summary used by existing lists.
- Link Delivery Attempts to their run, retain globally monotonic attempt numbers for the existing history API, and add run-relative attempt numbers so every replay receives a fresh bounded retry lifecycle without modifying historical attempts.
- Make dead-letter publication recoverable and at-least-once: persist the exhausted run before publishing, publish before committing the source delivery offset, and tolerate duplicate DLQ messages through a stable dead-letter identity.
- Add workspace-scoped APIs to list a project's dead-lettered deliveries, replay one terminal delivery (including a successful delivery), and replay all failed/dead-lettered deliveries for an event. Concurrent or retried replay commands must not create duplicate active runs.
- Replay against the immutable original event payload and the endpoint's current enabled configuration, returning a conflict when the endpoint is disabled or another run is already active.
- Add a dedicated dashboard Dead Letter Queue view with inspection, replay, and endpoint-disable actions, plus replay controls on eligible delivery and event views.
- Treat `DEAD_LETTERED` as a terminal failed outcome for Event aggregation; starting a replay reopens the affected Event as `PROCESSING` until the new run resolves.
- Keep automated DLQ replay, bulk project-wide replay, DLQ purging/retention management, RBAC role enforcement, HMAC signing, and transactional outbox guarantees out of this change.

## Capabilities

### New Capabilities

- `dead-letter-replay`: Exhausted-run dead-letter publication and lifecycle state, auditable Delivery Runs, workspace-scoped DLQ queries, safe manual delivery/event replay, and dashboard recovery workflows.

### Modified Capabilities

(none) — the repository still has no archived main capability specs; this change adds the remaining Phase 2 recovery contract as a new capability while building on the completed, unarchived `delivery-reliability` change.

## Impact

- Database: a new `delivery_runs` table; run linkage and run-relative numbering on `delivery_attempts`; `DEAD_LETTERED` status; latest-run/dead-letter publication metadata and indexes; backfill of an initial run for existing deliveries and attempts.
- Kafka contracts/topics: `relayforge.dlq`, a version-1 dead-letter message, and a delivery-job version carrying explicit run identity while retaining compatibility with delivery-job v1/v2 messages.
- Delivery worker: run-aware claim/completion, final-exhaustion publication, duplicate/recovery handling, and Event aggregation updates.
- Backend/API: CQRS commands and queries for DLQ listing, single-delivery replay, and failed-deliveries-for-event replay with workspace authorization and conflict semantics.
- Frontend: navigation and a dedicated DLQ screen, replay actions/feedback, run-aware attempt presentation, and terminal/non-terminal polling updates.
- Tests/documentation: migration/backfill coverage, DLQ publication and duplicate tests, replay concurrency and lifecycle E2E tests, dashboard tests, and updated roadmap/operator context.
