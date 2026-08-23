## 1. Kafka Contracts and Topic Bootstrap

- [x] 1.1 Add delivery-job v3 fields for run identity, run-relative attempt number, and stable run-aware job identity while retaining v1/v2 normalization
- [x] 1.2 Add the version-1 secret-free dead-letter message contract with stable dead-letter identity and safe final-failure summary fields
- [x] 1.3 Add `relayforge.dlq` and any required producer/topic constants to `packages/kafka-contracts`
- [x] 1.4 Bootstrap the DLQ topic through the delivery-worker topic service and keep isolated topic/group configuration usable by integration tests

## 2. Delivery Run Schema and Migration

- [x] 2.1 Add `DEAD_LETTERED` to the Delivery status enum and create Delivery Run trigger/status enums
- [x] 2.2 Create `delivery_runs` with delivery/run uniqueness, active-run exclusion, actor, attempt budget/counters, publication markers, lifecycle timestamps, and foreign keys
- [x] 2.3 Add Delivery `current_run_id`/`dead_lettered_at` fields and Delivery Attempt `run_id`/`run_attempt_number` fields with lookup and uniqueness indexes
- [x] 2.4 Backfill one initial run for every existing Delivery, map current statuses/counters, link existing sparse attempts, and preserve historical `FAILED` outcomes without DLQ publication
- [x] 2.5 Tighten nullable migration columns after backfill and add matching TypeORM Delivery Run, Delivery, and Delivery Attempt entities/data-source registration
- [x] 2.6 Implement a guarded down migration that is safe before replay data exists and documents why populated replay history must not be destructively rolled back
- [x] 2.7 Verify migration up/down and backfill behavior against pending, retrying, succeeded, legacy failed, and multi-attempt Delivery fixtures

## 3. Initial Runs and Run-Aware Delivery Jobs

- [x] 3.1 Update routing persistence so a new Delivery and initial run are created together with `current_run_id` set
- [x] 3.2 Emit delivery-job v3 for newly routed work with delivery-wide attempt 1 and run-relative attempt 1
- [x] 3.3 Update retry scheduling to preserve run identity, increment both attempt-number domains correctly, and select policy stages from the run-relative attempt
- [x] 3.4 Resolve retained v1/v2 jobs only against migrated initial runs so stale legacy messages cannot claim a manual replay run
- [x] 3.5 Add contract and routing tests covering v1/v2 compatibility, v3 serialization, stable job IDs, and duplicate routing

## 4. Run-Aware Claims and State Transitions

- [x] 4.1 Replace Delivery-only claim checks with transactional current-run validation covering run id/number, global/run-local counters, status, due time, token, and lease
- [x] 4.2 Snapshot the configured attempt limit on a run's first successful claim and reject jobs beyond that run's budget
- [x] 4.3 Insert/resume attempts with both numbering domains while preserving one active/completed attempt per logical run attempt
- [x] 4.4 Update successful completion to finalize the attempt and run, increment global/run counters, update Delivery summary, and aggregate the Event atomically
- [x] 4.5 Update retryable completion to keep run and Delivery scheduling fields consistent and return the next run-aware job metadata
- [x] 4.6 Distinguish active duplicates, completed duplicates, stale-run jobs, required retry publication, required DLQ publication, terminal legacy jobs, and missing work
- [x] 4.7 Preserve processing-lease recovery within the same run/attempt row and document the unchanged at-least-once external-send window

## 5. Dead-Letter Publication Pipeline

- [x] 5.1 Implement final-attempt completion that atomically marks the run/Delivery `DEAD_LETTERED`, stamps safe summary fields, clears ownership/scheduling, and aggregates the Event
- [x] 5.2 Add a dead-letter publisher that builds the v1 envelope from persisted safe data and keys it by project without payload, URL, body, or header leakage
- [x] 5.3 Publish the DLQ envelope and conditionally mark `dlq_published_at` before committing the source delivery offset
- [x] 5.4 Recover a persisted-but-unpublished dead letter on source redelivery without repeating the completed webhook request
- [x] 5.5 Make publish-succeeded/mark-or-commit-failed duplicates reuse the stable run identity and leave database history unchanged
- [x] 5.6 Update Event aggregation and Delivery response typing so `DEAD_LETTERED` is terminal-failed while `FAILED` remains supported for legacy rows

## 6. DLQ and Run-History Read APIs

- [x] 6.1 Add Delivery Run and DLQ response DTOs containing actor/run lineage and safe current failure summaries only
- [x] 6.2 Implement a paginated `GetDlqQuery` joining current Delivery/run/final-attempt/Event/Endpoint data newest-first with Project workspace authorization
- [x] 6.3 Expose authenticated `GET /api/v1/projects/:projectId/dlq` with existing pagination and cross-workspace not-found semantics
- [x] 6.4 Implement and expose authenticated `GET /api/v1/deliveries/:deliveryId/runs` ordered by run number with workspace authorization
- [x] 6.5 Extend attempt-history DTOs/query results with run id, run number, run trigger, and run-relative attempt number without exposing secrets
- [x] 6.6 Register the new entities, queries, controllers, and module dependencies without breaking existing Delivery/Event list filters

## 7. Manual Replay Commands

- [x] 7.1 Add a replay coordinator that locks a Delivery/current run, validates workspace/terminal state/current enabled Endpoint, and creates the next manual run under the same Delivery
- [x] 7.2 Build the replay's v3 attempt-1 job from the immutable Event payload and a snapshot of current Endpoint configuration
- [x] 7.3 Persist replay state before Kafka publication, conditionally mark `initial_job_published_at`, and resume the same unpublished run on a repeated command
- [x] 7.4 Implement `ReplayDeliveryCommand` with `202`, cross-workspace `404`, ineligible/disabled/active `409`, and retryable publication-failure `503` behavior
- [x] 7.5 Expose authenticated `POST /api/v1/deliveries/:deliveryId/replay` and return the created/resumed run identity
- [x] 7.6 Implement `ReplayEventCommand` that locks candidates in stable order, targets failed/dead-lettered Deliveries only, and records started/resumed/skipped/publication-failed results
- [x] 7.7 Expose authenticated `POST /api/v1/events/:eventId/replay`, returning per-delivery results and conflict when no eligible work exists
- [x] 7.8 Ensure starting any replay clears stale Delivery summary/dead-letter scheduling fields and changes the parent Event to `PROCESSING` in the same transaction
- [x] 7.9 Verify successful-delivery replay, repeated clicks/timeouts, disabled endpoints, active runs, and partial event replay cannot create concurrent runs

## 8. Dashboard Dead-Letter and Replay Experience

- [x] 8.1 Extend frontend Delivery/Attempt types for `DEAD_LETTERED`, runs, run-relative attempts, DLQ items, and replay result variants
- [x] 8.2 Add pure DLQ/run API functions plus TanStack query hooks and replay mutation hooks following the existing infrastructure structure
- [x] 8.3 Add authenticated `/dlq` routing and a real Dead Letter Queue navigation item in the dashboard shell
- [x] 8.4 Build the paginated newest-first DLQ table with Event, Endpoint, failure, attempts, last attempt, created/dead-lettered fields and loading/empty/error states
- [x] 8.5 Add a narrow-viewport-safe run/attempt inspector that groups immutable attempts by initial/manual run and exposes trigger/actor/status/timestamps
- [x] 8.6 Add confirmed single-delivery replay from DLQ and delivery detail with clear active, conflict, disabled-endpoint, and publication-failure feedback
- [x] 8.7 Add the DLQ disable-endpoint action by reusing the existing endpoint mutation and invalidating affected queries
- [x] 8.8 Add Event-detail replay of failed deliveries with started/resumed/skipped/publication-failed result feedback
- [x] 8.9 Invalidate Event/Delivery/run/attempt/DLQ queries after mutations and apply 5-second visible DLQ polling plus existing 2-second non-terminal inspector polling

## 9. Unit, Integration, and E2E Coverage

- [x] 9.1 Unit test delivery-job v3 normalization, dead-letter envelope safety, stable IDs, and run-relative retry-stage selection
- [x] 9.2 Integration test run-aware atomic claims, counter updates, lease recovery, stale v1/v2/v3 jobs, and active-run uniqueness
- [x] 9.3 Integration test five failures produce one exhausted run, `DEAD_LETTERED`, a safe DLQ envelope, and terminal Event aggregation
- [x] 9.4 Integration test DLQ publish failure/redelivery and publish-success/mark-or-commit-failure duplicates without another HTTP attempt
- [x] 9.5 Integration test dead-letter replay succeeds with a fresh five-attempt budget and globally monotonic immutable attempt history
- [x] 9.6 Integration test replay exhaustion creates a second dead-lettered run and republishes a new stable run identity
- [x] 9.7 E2E test DLQ pagination/ordering/safe summaries and run/attempt workspace isolation
- [x] 9.8 E2E test single replay authorization, current Endpoint configuration, successful replay, disabled/active conflicts, and unpublished-run resume
- [x] 9.9 E2E test event replay starts eligible failures, skips disabled/active/successful Deliveries, and returns per-delivery results without duplicates
- [x] 9.10 Add frontend tests for DLQ navigation/table states, run grouping, replay confirmations/results, disable action, query invalidation, and polling shutdown
- [x] 9.11 Exercise the full initial-exhaustion → DLQ → manual-replay → success workflow against Docker Compose with accelerated delays and inspect Kafka/database state

## 10. Verification and Documentation

- [x] 10.1 Run all available backend/worker/frontend lint or formatting checks, production builds/typechecks, unit tests, integration tests, and backend/frontend E2E suites
- [x] 10.2 Re-run migration up/down verification on a populated database and confirm rollback guards preserve replay history
- [x] 10.3 Verify DLQ messages and API responses contain no event payload, endpoint URL, bodies, credentials, or unredacted headers
- [x] 10.4 Update `LLM_CONTEXT.md` with run semantics, `DEAD_LETTERED`, replay behavior, publication gaps, and at-least-once guarantees
- [x] 10.5 Move the roadmap entry through Proposed/Doing/Done according to task progress and keep the next Phase 3 dependency ordering intact
- [x] 10.6 Run `openspec validate dead-letter-queue-and-replay --strict` and resolve every reported issue
