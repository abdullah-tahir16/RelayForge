## Why

This is the walking skeleton (`ROADMAP.md` Phase 1): the first change where an event actually flows through Kafka end-to-end, proving `documentation.md` §142's round trip with the smallest real slice through every layer. `auth-minimal`, `project-and-api-key-minimal`, and `endpoint-and-subscription-minimal` built every piece of configuration this pipeline needs (workspaces, projects, API keys, endpoints, subscriptions) but nothing has delivered anything yet. This change is what makes that configuration mean something.

## What Changes

- Add an `events` module (CQRS) in `apps/backend`: `POST /api/v1/events` (§20) authenticated by the caller's project API key, persists an Event to Postgres (§22) with status `ACCEPTED`, publishes to Kafka topic `relayforge.events` (§26) with status advancing to `PUBLISHED`, and responds `202 Accepted` (§21) without waiting on delivery.
- Add Kafka producer/consumer infrastructure under `apps/backend/src/kafka/` and `apps/delivery-worker/src/kafka/` — connection setup, topic definitions, serialization only, no domain logic (per `LLM_CONTEXT.md`'s module-structure rule).
- Add a `deliveries` module (CQRS) in `apps/backend` containing the **routing consumer** (§29): consumes `relayforge.events` on the `relayforge-routing-consumers` group, loads the event's project subscriptions and their endpoints, matches `eventType` against each `eventPattern` (implementing the matcher `endpoint-and-subscription-minimal` deliberately left uncalled), filters out disabled endpoints (§16), creates one Delivery record (§30) per match, and publishes a delivery job per record to `relayforge.deliveries`.
- Add a delivery-consumer service in `apps/delivery-worker`: consumes `relayforge.deliveries` on the `relayforge-delivery-consumers` group (§28), builds the webhook request (§32) — headers and JSON body, **no `X-RelayForge-Signature`** — POSTs it to the endpoint's URL, and records the attempt as `SUCCEEDED` or `FAILED` (§36-37) on the Delivery record.
- Add `packages/kafka-contracts`: versioned TypeScript message-envelope interfaces (§79-80, §123) for the `relayforge.events` and `relayforge.deliveries` messages — the only thing `apps/backend` and `apps/delivery-worker` share; no database entities cross that boundary.
- **Routing consumer lives in `apps/backend`, not `apps/delivery-worker`.** It needs the subscriptions/endpoints domain logic that already lives there. `apps/delivery-worker` only gets a minimal read path for the specific fields the HTTP-POST step needs (event payload, endpoint URL) — no duplicated `subscriptions`/`endpoints` entities.
- **No `Idempotency-Key` handling.** The header from §20 is not accepted, validated, or persisted by this change's DTO — `idempotency-keys` (Phase 3, #10) implements it with real dedup semantics; adding an unenforced column now would be dead weight with no reader.
- **No retries, no backoff, no `RETRYING`/`DEAD_LETTERED` statuses.** A failed attempt is recorded `FAILED` and left there — `delivery-attempts-and-retries` and `dead-letter-queue-and-replay` (Phase 2) own that.
- **No HMAC signing.** Webhook requests go out unsigned; `hmac-signing-and-secret-rotation` (Phase 3) adds `X-RelayForge-Signature` and the secret it's built from.
- **No `relayforge.retry`, `relayforge.dlq`, or `relayforge.delivery-results` topics.** Only `relayforge.events` and `relayforge.deliveries` (§25) are created — the other three have no producer or consumer until the changes that own them exist.
- **No dashboard.** `basic-dashboard` (next Planned item) is the read-side UI over the Event/Delivery records this change creates.

## Capabilities

### New Capabilities
- `events`: event ingestion API (`POST /api/v1/events`), Event entity/persistence, publishing to `relayforge.events`.
- `deliveries`: routing consumer (subscription matching → Delivery record creation → `relayforge.deliveries` publish) and delivery consumer (webhook POST, attempt recording, `SUCCEEDED`/`FAILED` status).

### Modified Capabilities
(none) — `endpoints` and `subscriptions` are read by the routing consumer but their own stored data and validation rules are unchanged; the wildcard-matching *behavior* is a requirement of the new `deliveries` capability, which is its only caller.

## Impact

- New tables: `events` (scoped via `projectId`) and `deliveries` (scoped via `eventId` + `endpointId`, with a uniqueness constraint on that pair per §47's at-least-once consumer-idempotency requirement).
- New Kafka topics: `relayforge.events`, `relayforge.deliveries`. New consumer groups: `relayforge-routing-consumers`, `relayforge-delivery-consumers`.
- First real code in `apps/delivery-worker` and first real content in `packages/kafka-contracts` — both currently empty scaffolding from `bootstrap-monorepo-scaffolding`.
- `docker-compose.yml`'s Kafka service (already wired, previously unused) becomes load-bearing.
