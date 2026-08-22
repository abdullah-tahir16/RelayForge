## Context

The existing worker consumes `relayforge.deliveries`, skips Delivery rows already at `SUCCEEDED` or `FAILED`, performs one HTTP request, writes the latest status/code/duration directly onto `deliveries`, aggregates the parent Event, and commits the Kafka offset. There is no attempt table, `FAILED` is immediate and terminal, and `DeliveryRequestedMessage` has no attempt identity. See `proposal.md` for motivation and `specs/delivery-reliability/spec.md` for the behavior contract.

The retry mechanism must remain Kafka-led, tolerate at-least-once messages, and avoid adding Redis or a general-purpose job system. It also has to support delays up to one hour without holding an `eachMessage` handler open, and preserve compatibility with already-retained version-1 delivery messages.

## Goals / Non-Goals

**Goals:**
- Make every attempted HTTP request independently inspectable while retaining denormalized latest-outcome fields on Delivery for efficient existing lists.
- Make each scheduled attempt uniquely identifiable and safe under Kafka redelivery or concurrent workers.
- Keep retry delay state durable across process restarts and keep Kafka offset ownership explicit.
- Give Phase 2's subsequent DLQ/replay change a clean exhausted-delivery boundary and complete attempt history.

**Non-Goals:**
- No `relayforge.dlq`, `DEAD_LETTERED`, replay API, or replay lineage yet.
- No per-project or per-endpoint retry policy UI; this change provides operator configuration only.
- No HMAC signing, SSRF/redirect hardening, WebSocket push, transactional outbox, or exactly-once HTTP guarantee.
- No removal of Delivery's current `httpStatusCode` and `durationMs` summary fields.

## Decisions

**1. Use four staged Kafka retry topics, not a PostgreSQL polling scheduler.**

Create `relayforge.retry.30s`, `relayforge.retry.2m`, `relayforge.retry.10m`, and `relayforge.retry.1h`, all consumed by `relayforge-retry-consumers`. A versioned `DeliveryRetryScheduledMessage` carries the delivery job, target `attemptNumber`, `notBefore`, and retry-stage metadata. On a failed non-final attempt, the worker completes the attempt transaction and publishes the next job to its stage topic before committing the source delivery offset.

When a retry consumer sees a future `notBefore`, it pauses that topic partition, returns from the handler, and schedules a bounded resume that seeks back to the uncommitted offset; it continues heartbeating rather than sleeping in the handler. Fixed-delay stage messages are produced in chronological order within each project-keyed partition, making head-of-line waiting intentional. When due, it republishes the job to `relayforge.deliveries` and only then commits the retry-topic offset.

The four delays are operator-configurable for tests/local use while topic identities remain stable. Production defaults match their names and `documentation.md` §38/40.

*Alternatives considered:* PostgreSQL `next_attempt_at` polling with `FOR UPDATE SKIP LOCKED` is operationally simpler, but it bypasses the roadmap's explicit Retry Topics milestone and provides less direct practice with Kafka offset/delay behavior. Sleeping inside `eachMessage` was rejected because hour-long handlers risk consumer liveness and rebalances. Redis/BullMQ was rejected because Kafka owns this pipeline.

**2. Version delivery jobs explicitly and accept retained v1 messages as initial attempts.**

Add a version-2 delivery job with `attemptNumber`, `scheduledAt`, and a stable job identity. The routing producer emits v2. The delivery consumer parses both versions, mapping a retained v1 job to attempt 1, so a rolling deploy or retained topic cannot strand existing deliveries. Retry messages start at version 1 and wrap the v2 delivery data rather than database entities.

*Alternative considered:* Adding required fields without changing the message version was rejected because it makes old retained messages invalid and undermines the purpose of versioned contracts.

**3. Persist attempt history and delivery transitions in short transactions around the HTTP call.**

Add `delivery_attempts` with UUID id, `delivery_id`, `attempt_number`, redacted request headers, response status/headers/body preview, duration, error code/message, `started_at`, and `completed_at`; enforce `UNIQUE(delivery_id, attempt_number)` and index `delivery_id`. Add `PROCESSING` and `RETRYING` to the delivery status enum plus `next_attempt_at`, `processing_token`, and `processing_expires_at`.

Before sending, a short transaction conditionally claims the expected attempt when the delivery is due, allocates a random processing token, sets `PROCESSING`, and inserts or resumes the unique attempt row. A claim is accepted only when `attempt_count = attemptNumber - 1` and no unexpired processing owner exists. The HTTP request occurs outside the transaction. Completion requires the same processing token, finalizes the attempt, increments `attempt_count`, copies the latest outcome onto Delivery, clears ownership, and atomically sets `SUCCEEDED`, `RETRYING` with `next_attempt_at`, or exhausted `FAILED`.

A duplicate for an active or completed attempt is skipped. An expired owner can be reclaimed using the same attempt row; because the crash may have happened after the destination accepted the request, this recovery remains at-least-once and may repeat the external call. The processing lease defaults above the maximum endpoint timeout and is configurable.

*Alternatives considered:* Holding a PostgreSQL advisory lock across the HTTP call would avoid a lease but consumes one dedicated database connection per concurrent request and couples HTTP concurrency to pool size. Relying only on a read-before-send status check was rejected because two consumers can race.

**4. Store safe, bounded diagnostics and keep Delivery as a read-model summary.**

Extend the sender result to capture response headers, a bounded response-body preview, and normalized transport errors. Header names are compared case-insensitively against a configurable denylist including `authorization`, `cookie`, `set-cookie`, proxy credentials, and RelayForge signature headers; values are replaced before persistence. Response bodies are streamed/read only up to the configured preview limit and never interpreted as trusted content. Error messages are normalized to avoid leaking request secrets.

The latest status code and duration remain on Delivery for current filters and tables. Attempt rows are authoritative history; `attempt_count` is the count of completed attempts, not claims.

*Alternative considered:* Moving all reads to an aggregate over attempt rows would make every delivery list more expensive and create an unnecessary breaking response change.

**5. Aggregate Events only after all deliveries are terminal.**

Update the aggregate query so `PENDING`, `PROCESSING`, and `RETRYING` all keep the Event at `PROCESSING`. Only `SUCCEEDED` and exhausted `FAILED` contribute to `COMPLETED`, `PARTIALLY_FAILED`, or `FAILED`. Scheduling a retry and publishing its topic message occur before committing the source job, so a publish failure causes Kafka redelivery rather than a falsely terminal Event.

**6. Add a tenant-scoped attempts read path and a small frontend extension.**

`apps/backend` owns the TypeORM DeliveryAttempt read model and exposes `GET /api/v1/deliveries/:deliveryId/attempts`. The query joins Delivery → Event → Project and applies the existing user-to-workspace lookup before returning rows ordered by attempt number. The response DTO contains only stored redacted headers.

The frontend adds attempt types/API/query hooks, recognizes the two new statuses, shows `nextAttemptAt`, and renders an on-demand attempt timeline from the existing event-delivery view. TanStack Query polls event detail, deliveries, and an open attempt history every 2 seconds while work is non-terminal; broader event lists poll every 5 seconds. Polling stops once all displayed work is terminal and does not run in background tabs. WebSocket replacement remains deferred.

## Risks / Trade-offs

- **[A paused retry partition delays later records in that partition]** → Fixed-delay topic records are due in production order; key by project, resume at the earliest `notBefore`, and test ordering/rebalance behavior. Scale partitions if throughput makes head-of-line delay material.
- **[Publish succeeds but offset commit fails, producing duplicate retry or delivery jobs]** → Stable delivery/attempt identity plus the conditional claim makes duplicate messages harmless.
- **[Worker crashes after the endpoint accepts but before outcome persistence]** → Expiring ownership permits recovery, but the request may be repeated; document and test this as at-least-once rather than promise impossible exactly-once HTTP delivery.
- **[Captured responses leak secrets or consume excessive storage]** → Redact configured headers before write, bound previews, never persist full response bodies, and test case-insensitive redaction.
- **[Four new topics increase local and operational complexity]** → Bootstrap them through the existing topic service, centralize names/contracts, and expose short configurable delays for tests.
- **[Existing terminal deliveries have no normalized attempt rows]** → Backfill one sparse attempt from each existing Delivery with `attempt_count > 0`; unavailable historical headers/body/error details remain null rather than invented.

## Migration Plan

1. Deploy the additive database migration first: new enum values/columns/table/indexes, then backfill one sparse attempt for existing completed deliveries while leaving existing `SUCCEEDED`/`FAILED` outcomes terminal and not retrying them retroactively.
2. Deploy topic bootstrapping and consumers that accept delivery message v1 and v2 before switching the routing producer to v2.
3. Deploy the backend attempt-history endpoint and frontend status/timeline support.
4. Roll back application code by stopping retry consumers and reverting producers to v1; the additive table/columns and topics can remain safely unused. Drop them only in a later controlled migration after confirming no pending `RETRYING` deliveries.

The response-body preview limit defaults to 4 KiB (4,096 bytes), is enforced while streaming rather than after buffering the full response, and remains operator-configurable.
