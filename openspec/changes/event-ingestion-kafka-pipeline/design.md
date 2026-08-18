## Context

`apps/backend` currently has five real modules (`auth`, `workspaces`, `projects`, `api-keys`, `endpoints`, `subscriptions`) but nothing that touches Kafka. `apps/delivery-worker` and `packages/kafka-contracts` are still `.gitkeep` stubs from `bootstrap-monorepo-scaffolding` — this is the first change to write real code in either. No API-key auth guard exists yet: `ApiKeysRepository` has no lookup-by-hash method, and the only guard in the repo is `JwtAuthGuard` for user sessions. No `/health` endpoint exists either — `auth-minimal`'s design.md explicitly deferred it here, to the first change that needs to report Postgres *and* Kafka readiness together (§116). See `proposal.md` for motivation and `specs/events/spec.md` / `specs/deliveries/spec.md` for the exact behavior contract.

The worker/backend data-access split and the Idempotency-Key scope question were both settled in exploration before this proposal was written: the routing consumer stays in `apps/backend` (it needs the subscriptions/endpoints domain logic already there), and `Idempotency-Key` is out of scope entirely for this change.

## Goals / Non-Goals

**Goals:**
- Stand up `apps/delivery-worker` as a real second NestJS application, and give it a Postgres connection for exactly one write, no more.
- Give `apps/backend` and `apps/delivery-worker` a shared, versioned Kafka message contract (`packages/kafka-contracts`) without either side depending on the other's database entities.
- Ship `GET /health`, `/health/live`, `/health/ready` (§116) on `apps/backend`, checking Postgres and Kafka producer connectivity — the commitment `auth-minimal` deferred to this change.
- Satisfy every requirement in `specs/events/spec.md` and `specs/deliveries/spec.md`.

**Non-Goals:**
- No retries, backoff, `relayforge.retry`, or `relayforge.dlq` — `delivery-attempts-and-retries` and `dead-letter-queue-and-replay` (Phase 2).
- No HMAC signing or `X-RelayForge-Signature` — `hmac-signing-and-secret-rotation` (Phase 3).
- No `Idempotency-Key` acceptance or enforcement — `idempotency-keys` (Phase 3).
- No `relayforge-analytics-consumers` group or `relayforge.delivery-results` topic — no analytics capability exists yet to consume them.
- No transactional outbox — `transactional-outbox` (Phase 5). A publish failure after persisting is handled by failing the request closed (see `specs/events/spec.md`), not by a background reconciler.
- No dashboard or WebSocket push — `basic-dashboard` and `realtime-websockets`.

## Decisions

**1. Kafka client — `kafkajs` directly, not `@nestjs/microservices`'s Kafka transport.**
The microservices transport is built around request/response-style message handlers; this pipeline needs independent consumer groups with manual offset control (commit only after the DB write that makes processing idempotent succeeds) and its own producer used from a plain CQRS command handler, not a `@MessagePattern` handler. `kafkajs` used directly through a small injectable producer/consumer service maps onto that shape without fighting the abstraction, and keeps Kafka mechanics genuinely visible per §81's learning objectives.
*Alternative considered:* `@nestjs/microservices` Kafka transport. Rejected — its request/response and single-handler-per-pattern model doesn't fit two independently-committing consumer groups reading the same topic-adjacent pipeline as naturally as direct `kafkajs` use.

**2. New API-key auth guard, added now because this is its first real caller.**
Add `ApiKeyStrategy` (Passport, `HeaderAPIKeyStrategy`-style bearer extraction) and `ApiKeyAuthGuard` to the `api-keys` module: hash the presented token the same way `ApiKeyGeneratorService` does, look it up via a new `ApiKeysRepository.findByHash`, reject if not found or `revokedAt` is set, otherwise attach the key's `projectId` to the request and update `lastUsedAt`. `POST /api/v1/events` is the only route protected by it in this change.
*Alternative considered:* none seriously — this is the same "no caller, no code" deferral `project-and-api-key-minimal` already flagged when it built the hash/prefix columns without a validation path; this change is that path's first and only caller.

**3. Delivery jobs carry everything the delivery consumer needs; `apps/delivery-worker` never reads `endpoints`, `subscriptions`, or `events` tables.**
The routing consumer, which already has the domain objects loaded, embeds the endpoint's URL and `timeoutMs`, and the event's id, type, `createdAt`, and `data` payload directly into the `relayforge.deliveries` message alongside `deliveryId`/`eventId`/`endpointId`. The delivery consumer never uses an ORM or reads any table — its DB access is two plain parametrized statements through a `pg` client: (a) `UPDATE deliveries SET status = $1, ... WHERE id = $2 AND status NOT IN ('SUCCEEDED','FAILED')`, guarding against redelivery, and (b) a second statement that re-derives the event's aggregate status from a `COUNT`-by-status subquery over its deliveries and writes it to `events.status` (`COMPLETED`/`PARTIALLY_FAILED`/`FAILED`) once none remain non-terminal. No `DeliveryEntity` or `EventEntity` is duplicated — both statements name their columns directly, the same way the routing consumer's insert does.
*Alternative considered 1:* give `apps/delivery-worker` its own `DeliveryEntity` (Option A from exploration). Rejected — a full TypeORM setup for two raw statements is more code and more drift surface than parametrized SQL.
*Alternative considered 2:* reinstate `relayforge.delivery-results` and have a consumer back in `apps/backend` do the aggregation instead of the worker writing `events.status` directly. Rejected for this change — it's a third topic and consumer group for a walking skeleton that already has two of each; the worker writing one more column with a guarded raw statement is simpler, and revisiting this with a real `delivery-results` topic is a natural, non-breaking follow-up once `consumer-observability-metrics` or an analytics use case actually needs that stream.

**4. `apps/delivery-worker` runs as a Nest application context, not an HTTP server.**
It has no REST surface in this change (`docker-compose.yml` already declares it with no `ports:` mapping) — `NestFactory.createApplicationContext` starts DI, the Kafka consumers, and the `pg` pool without an unused HTTP listener. `/health` stays on `apps/backend` only.

**5. Kafka partition key is `projectId`, per §27's primary recommendation.**
Preserves per-project ordering without needing the optional `projectId:orderingKey` compound form, which has no concrete requirement driving it yet.

**6. `deliveries` table migration lives in `apps/backend`; `apps/delivery-worker` never runs migrations.**
Consistent with every migration so far being backend-owned. The worker connects to the same Postgres instance with a plain `pg` client for its single query — it has no TypeORM/migration setup at all.

**7. Manual offset commit, after the DB write that makes each message's processing idempotent.**
The routing consumer commits only after its Delivery rows are persisted (protected by the `(eventId, endpointId)` uniqueness constraint); the delivery consumer commits only after its status `UPDATE` completes (protected by only ever transitioning out of a non-terminal state, per `specs/deliveries/spec.md`'s redelivery requirement). This is what makes at-least-once Kafka delivery safe to combine with the dedup requirements already in the spec.

## Risks / Trade-offs

- **[Full event payload embedded in the delivery message, not referenced by id]** → Mitigation: explicitly permitted by §26 "may include the payload directly for learning purposes"; bounded by the same 256 KB ingestion limit. Revisit if message size becomes an operational problem before `event-search-and-filters` or similar gives a reason to fetch payloads by id instead.
- **[Publish-after-persist has no transactional guarantee between the Postgres write and the Kafka publish]** → Mitigation: the spec fails closed — a publish failure surfaces as an error response and the event stays at `ACCEPTED`, so nothing is silently lost, but a crash in that narrow window between commit and publish would strand an `ACCEPTED` event with no consumer of it. Accepted for the walking skeleton; `transactional-outbox` (Phase 5) closes this properly.
- **[`apps/delivery-worker` is the first app in the repo with no HTTP surface at all]** → Mitigation: matches §121's process-separation intent; documented here so it isn't later mistaken for a missing Dockerfile or health story.
- **[No RBAC — any authenticated request or valid project API key is fully privileged within its scope]** → Mitigation: unchanged from `auth-minimal`'s accepted risk; still deferred to `workspaces-and-team-rbac`.
