## Context

The completed retry change leaves each logical Delivery with immutable attempts, a globally increasing `attempt_count`, and one current status. Its worker treats exhausted `FAILED` as terminal, supports delivery-job v1/v2, and can recover a retry publication after database completion but before Kafka acknowledgement. There is no durable representation of separate delivery lifecycles, no `relayforge.dlq`, and no backend command path that can safely reopen a terminal Delivery. See `proposal.md` for motivation and `specs/dead-letter-replay/spec.md` for the behavioral contract.

The design must build on Kafka and PostgreSQL without Redis, preserve the existing unique logical Delivery per `(event_id, endpoint_id)`, remain compatible with retained v1/v2 delivery jobs, and not claim exactly-once publication. The later transactional-outbox change remains responsible for fully autonomous database-to-Kafka recovery.

## Goals / Non-Goals

**Goals:**
- Give each initial/manual lifecycle a stable identity and snapshotted attempt budget while retaining Delivery as the current summary and Delivery Attempt as immutable HTTP history.
- Make final exhaustion and DLQ publication recoverable under source-message redelivery without repeating the already completed HTTP attempt.
- Serialize manual replay per logical Delivery and make request retries reuse unpublished work rather than create parallel lifecycles.
- Keep DLQ reads tenant-safe, efficient, and independent of Kafka retention.
- Preserve enough run and actor lineage for later audit-log and RBAC changes to build on.

**Non-Goals:**
- No automatic replay consumer, scheduled replay, project-wide replay, DLQ purge policy, or Kafka-to-database DLQ projection.
- No public `Idempotency-Key` contract; replay idempotence is limited to current persisted run state until the planned ingestion/idempotency change.
- No role matrix beyond the repository's current workspace authorization model.
- No outbox, exactly-once Kafka publication, HMAC signing, endpoint test delivery, or SSRF/redirect changes.
- No separate Delivery row per replay and no change to the unique logical Delivery per event/endpoint.

## Decisions

**1. Model replay as Delivery Runs beneath one logical Delivery.**

Add `delivery_runs` with UUID `id`, `delivery_id`, ordered `run_number`, trigger (`INITIAL` or `MANUAL`), nullable `requested_by_user_id`, run status, snapshotted `attempt_limit`, run-local `attempt_count`, `initial_job_published_at`, `dlq_published_at`, and lifecycle timestamps. Enforce `UNIQUE(delivery_id, run_number)` and a partial unique index that permits at most one `PENDING`, `PROCESSING`, or `RETRYING` run per Delivery. The user foreign key uses `ON DELETE SET NULL` so actor attribution survives as an anonymous historical action if account removal is introduced later.

Add `current_run_id` and `dead_lettered_at` to Delivery. Delivery remains the latest-run read-model summary, and its existing `attempt_count` remains the total number of completed attempts across all runs. `DEAD_LETTERED` joins the Delivery status enum; legacy `FAILED` remains a terminal compatibility state for pre-DLQ rows.

Add non-null `run_id` and `run_attempt_number` to Delivery Attempt after backfill. Keep the existing unique `(delivery_id, attempt_number)` so delivery-wide attempt numbers remain monotonically increasing, and add `UNIQUE(run_id, run_attempt_number)` so every run starts locally at attempt 1. Attempt-history DTOs gain run identity/number/trigger, and `GET /api/v1/deliveries/:deliveryId/runs` exposes run records including zero-attempt unpublished runs.

The worker snapshots its configured maximum attempt count into `delivery_runs.attempt_limit` when the first attempt is claimed. This keeps retry policy ownership in the worker and avoids duplicating delivery-worker configuration in the backend; the backend may create a run with a null attempt limit before its first claim.

*Alternatives considered:* A new Delivery row per replay makes the attempt budget simple, but breaks the current `(event_id, endpoint_id)` invariant, duplicates endpoint rows, and forces aggregation to choose a lineage leaf. Resetting the same Delivery without a run table hides lifecycle boundaries and cannot attribute replay actors cleanly. A separate run table preserves both logical identity and auditability.

**2. Version delivery jobs for explicit run identity while accepting retained jobs.**

Add delivery-job v3 with `runId`, `runNumber`, `runAttemptNumber`, the delivery-wide `attemptNumber`, and the existing v2 scheduling fields. Stable job identity includes the run and run-relative attempt. Retry messages continue at their existing envelope version and wrap the v3 delivery job.

Routing creates Delivery plus initial run together and emits v3 attempt 1. Replay commands construct a v3 attempt-1 job from the immutable Event payload and a snapshot of the Endpoint's current enabled configuration. The worker continues parsing v1/v2 jobs and resolves them only against the migrated initial run; an old job cannot be interpreted as work for a later manual run. Repository claims validate current run, run number, both attempt counters, status, and lease before sending.

*Alternative considered:* Inferring the current run for every old-shaped message would reduce contract work but could let a retained initial-attempt message collide with a manual replay. Explicit v3 identity makes stale messages distinguishable and preserves rolling compatibility.

**3. Treat PostgreSQL as the canonical DLQ read model and Kafka as an at-least-once notification stream.**

Bootstrap `relayforge.dlq` with the existing topic service. A version-1 `DeliveryDeadLetteredMessage` is keyed by project and uses the run UUID as its stable dead-letter identity. It contains project/event/delivery/endpoint/run identifiers, run and attempt counts, final safe status/error summary, and dead-letter time. It deliberately excludes event data, endpoint URL, headers, and response/request bodies.

The dashboard query reads PostgreSQL, not Kafka. Kafka retention therefore cannot remove a row from the user-visible DLQ, and duplicate Kafka notifications do not duplicate database state. `GET /api/v1/projects/:projectId/dlq` filters Deliveries whose current status is `DEAD_LETTERED`, joins the current run/final attempt/Event/Endpoint for safe summary fields, and follows existing pagination and workspace-not-found conventions.

*Alternative considered:* Building the dashboard directly from a DLQ consumer/projection adds another eventually consistent store and consumer without improving the canonical recovery workflow. Publishing full jobs or payloads to the DLQ was rejected because it expands secret/PII exposure and is unnecessary for replay, which can rebuild work from PostgreSQL.

**4. Persist final exhaustion before publishing, and recover publication through source redelivery.**

Final-attempt completion is one database transaction that finalizes the attempt, sets the run and Delivery to `DEAD_LETTERED`, clears processing ownership, stamps `dead_lettered_at`, and recomputes the parent Event. It leaves `dlq_published_at` null and returns the safe dead-letter envelope. The delivery consumer publishes that envelope, marks the same run published with a conditional update, and only then commits the source delivery offset.

If database completion succeeds but Kafka publication fails, the uncommitted source job returns. A run-aware claim outcome such as `dead_letter_publish_required` republishes without resending the webhook. If Kafka succeeds but marking or committing fails, the envelope may be published again; stable identity makes that explicit at-least-once behavior safe for downstream consumers. `dlq_published_at` prevents unnecessary republish after the database mark succeeds.

*Alternative considered:* A database outbox would provide autonomous and cleaner publication guarantees, but it is a separately planned cross-cutting change. Publishing before recording exhaustion risks a DLQ notification for uncommitted state and was rejected.

**5. Serialize replay creation in the backend and publish stable initial jobs after commit.**

A replay coordinator uses a transaction and `FOR UPDATE` locking on each target Delivery/current run. Single replay accepts latest terminal `SUCCEEDED`, `DEAD_LETTERED`, or legacy `FAILED`; it verifies workspace ownership and that the current Endpoint is enabled. It inserts the next manual run, points Delivery at it, clears stale latest-outcome/scheduling fields, sets Delivery/Event to `PENDING`/`PROCESSING`, and commits before Kafka publication.

The run's stable initial job is then published to `relayforge.deliveries`, after which `initial_job_published_at` is conditionally set. A repeated command encountering the same manual `PENDING` run with no publication timestamp republishes that run rather than inserts another. A published active run returns conflict. A publication failure returns a retryable service error while leaving the exact run recoverable by repeating the action. This narrows, but intentionally does not eliminate, the database/Kafka gap deferred to the outbox change.

Event replay locks candidate Deliveries in stable ID order, creates or reuses all eligible runs in one transaction, and returns per-delivery results. Successful Deliveries are not targets; disabled endpoints and published active runs are reported as skipped. After commit, jobs are published independently with stable IDs. The response distinguishes started, resumed, skipped, and publication-failed items; it returns `202 Accepted` when at least one job is published and conflict when no eligible work exists. A single replay returns `202` after publication, `409` for disabled/active/ineligible state, `404` across workspace boundaries, and a retryable `503` when its persisted run remains unpublished.

*Alternatives considered:* Publishing inside the database transaction cannot make Kafka atomic and holds locks across network I/O. Publishing first lets a fast worker observe a run that does not exist. Creating a new run on every repeated HTTP request was rejected because double-clicks and ambiguous client timeouts would create concurrent external sends.

**6. Recompute Event status from each logical Delivery's latest run summary.**

The existing one-row-per-event/endpoint Delivery invariant means aggregation still counts each logical Delivery once. `PENDING`, `PROCESSING`, and `RETRYING` remain active; `SUCCEEDED` is successful; both `FAILED` and `DEAD_LETTERED` are terminal failures. Starting a replay sets the target Delivery and Event non-terminal in the replay transaction. Completion recomputes the Event atomically with the latest Delivery outcome, so a previously failed Event can become `PROCESSING` and later `COMPLETED` if replay repairs its last failures.

Historical failed/dead-lettered runs never participate separately in aggregation. They remain visible only in run/attempt history.

**7. Add a dedicated DLQ feature using existing API/hook/container/component patterns.**

Add `/dlq` to authenticated routing and navigation. The feature uses a pure paginated DLQ API function, TanStack query hook, feature hook, render-only container, and shared `App*` components. The table follows the documented Event/Endpoint/Failure/Attempts/Last Attempt/Created fields and adds dead-letter time. Inspect opens the run-aware attempt view; Replay uses a confirmation dialog because it causes external delivery; Disable Endpoint reuses the existing endpoint command and invalidates endpoint/DLQ queries.

Delivery detail gains run grouping and single replay for eligible terminal states. Event detail gains "Replay failed deliveries" with a result summary for started/resumed/skipped/publication failures. Successful mutations invalidate Event, Delivery, runs, attempts, and DLQ keys immediately. DLQ pages poll every 5 seconds while visible; an open replay/run inspector follows the existing 2-second non-terminal cadence and stops for terminal data/background tabs.

*Alternative considered:* Reusing the Events table with a status filter does not expose the final-attempt and endpoint recovery context expected from a dedicated DLQ workflow.

## Risks / Trade-offs

- **[A replay reopens a previously completed Event and replaces Delivery's latest summary]** → Make the transition explicit in confirmation copy and preserve every prior outcome in immutable runs/attempts.
- **[Kafka can contain duplicate dead-letter notifications]** → Use run ID as stable dead-letter identity, document at-least-once semantics, and keep database state idempotent.
- **[A replay run can be persisted while its first job is unpublished]** → Persist an explicit publication timestamp, surface retryable failure, and make repeated replay resume the same run; the later outbox change will add autonomous repair.
- **[Bulk replay can publish only a subset after its database transaction]** → Return per-delivery publication results, keep unpublished runs resumable, and use stable job IDs so retry is safe.
- **[Current endpoint configuration can change again after replay is requested]** → Snapshot the enabled Endpoint configuration into the v3 job at command time, matching normal routing semantics; show the endpoint identity in confirmation.
- **[Run/attempt joins increase DLQ query cost]** → Store current run/dead-letter timestamps on Delivery, index current `DEAD_LETTERED` rows, and join only the current run/final attempt for the paginated page.
- **[Legacy failed rows lack exact original attempt budgets or full history]** → Backfill one initial run using `max(default limit, recorded attempt_count)`, retain sparse attempts as-is, keep `FAILED`, and do not invent or publish historical DLQ events.
- **[Old workers cannot understand v3 replay jobs]** → Deploy v3-aware consumers before enabling v3 routing/replay producers and keep v1/v2 parsing until retained messages have aged out.

## Migration Plan

1. Apply an additive migration: add `DEAD_LETTERED`, create run enums/table/indexes, add nullable run/current-run/dead-letter columns, backfill one initial run per Delivery, link every existing attempt with matching run-relative numbering, set each current run, then make required links non-null. Preserve legacy `FAILED` and do not publish historical DLQ notifications.
2. Deploy contracts/topic bootstrap and worker code that accepts v1/v2/v3, understands runs, and can publish/recover DLQ notifications. Do not enable replay producers yet.
3. Switch routing to create initial runs and emit v3 jobs, then deploy backend DLQ/run queries and replay commands.
4. Deploy the frontend DLQ route and replay controls after the APIs and `DEAD_LETTERED` response typing are available.
5. Verify with accelerated Compose flows: initial exhaustion to DLQ, duplicate DLQ publication, single replay success, replay exhaustion, successful-delivery replay, partial event replay, publication failure/resume, and workspace isolation.

Application rollback after replay begins requires disabling replay entry points, stopping new v3 production, and draining or removing retained v3 jobs before running an older worker. Map current `DEAD_LETTERED` Delivery summaries to legacy `FAILED` only if an old backend must be restored; keep run tables/links in place because dropping them would destroy replay history. A destructive migration down is appropriate only before any replay run is created or after an explicit data export and maintenance window.
