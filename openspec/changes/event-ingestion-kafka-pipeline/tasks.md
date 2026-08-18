## 1. Kafka Contracts Package

- [x] 1.1 Scaffold `packages/kafka-contracts` as a real TypeScript package (package.json, tsconfig.json) replacing its `.gitkeep`
- [x] 1.2 Define `EventPublishedMessage` (for `relayforge.events`) and `DeliveryRequestedMessage` (for `relayforge.deliveries`) interfaces with an explicit `version: 1` field per §80; `DeliveryRequestedMessage` includes the endpoint URL/timeoutMs and event id/type/createdAt/data per design Decision 3
- [x] 1.3 Add `packages/kafka-contracts` as a workspace dependency of `apps/backend` and `apps/delivery-worker`

## 2. delivery-worker App Scaffolding

- [x] 2.1 Scaffold `apps/delivery-worker` as a NestJS app (package.json, nest-cli.json, tsconfig.json, tsconfig.build.json) replacing its `.gitkeep`
- [x] 2.2 Add `main.ts` using `NestFactory.createApplicationContext` (no HTTP listener) with shutdown hooks enabled (§115)
- [x] 2.3 Add `kafkajs` and `pg` dependencies

## 3. Kafka Infrastructure

- [x] 3.1 `apps/backend/src/kafka`: producer service (connect on module init, disconnect on shutdown, publish keyed by `projectId` per §27)
- [x] 3.2 `apps/backend/src/kafka`: consumer factory for the `relayforge-routing-consumers` group, manual offset commit
- [x] 3.3 `apps/delivery-worker/src/kafka`: consumer factory for the `relayforge-delivery-consumers` group, manual offset commit
- [x] 3.4 Startup topic bootstrapping: create `relayforge.events` and `relayforge.deliveries` via the Kafka admin client if they don't already exist
- [x] 3.5 Enable NestJS shutdown hooks in both apps so consumers stop cleanly (§115)

## 4. Database Schema & Migrations

- [x] 4.1 Add `events` TypeORM entity + migration (id, projectId, eventType, payload, metadata, status, createdAt, publishedAt) — no `idempotencyKey` column, per the proposal's explicit deferral to `idempotency-keys`; `projectId` FK `ON DELETE CASCADE`
- [x] 4.2 Add `deliveries` TypeORM entity + migration (id, eventId, endpointId, status, attemptCount, completedAt, failedAt, createdAt, updatedAt) — no `nextAttemptAt` column, deferred to `delivery-attempts-and-retries` as a trivial additive migration when retries exist to schedule; unique constraint on `(eventId, endpointId)`, both FKs `ON DELETE CASCADE`

## 5. API-Key Auth Guard

- [x] 5.1 Add `ApiKeysRepository.findByHash(hash)`
- [x] 5.2 Add `ApiKeyStrategy` (Passport bearer extraction) that hashes the presented token with the existing `hashOpaqueToken` util, looks it up via `findByHash`, and rejects if not found or `revokedAt` is set
- [x] 5.3 Add `ApiKeyAuthGuard` extending `AuthGuard('api-key')`; attach the resolved `projectId` to the request
- [x] 5.4 On successful validation, update the key's `lastUsedAt`

## 6. Events Domain (CQRS)

- [x] 6.1 Implement an event-type validator: dot-separated lowercase alphanumeric segments, no wildcard
- [x] 6.2 Implement a payload-size guard (configurable max, default 256 KB)
- [x] 6.3 Implement `IngestEventCommand` + handler: persist the Event at `ACCEPTED`, publish to `relayforge.events`, advance to `PUBLISHED` on successful publish; on publish failure, leave the event `ACCEPTED` and propagate the error

## 7. Events API

- [x] 7.1 Wire `POST /api/v1/events` (guarded by `ApiKeyAuthGuard`) to `IngestEventCommand`, using the guard-resolved `projectId`
- [x] 7.2 Map a payload-size violation to `413 Payload Too Large` and a malformed event type to `400`, both without creating an Event
- [x] 7.3 Return `202 Accepted` with id, event type, status, and creation time on success

## 8. Routing Consumer (apps/backend)

- [x] 8.1 Implement the event-pattern matcher (exact match, `*`, and `prefix.*` wildcard) that `endpoint-and-subscription-minimal` deliberately left uncalled
- [x] 8.2 Implement `RouteEventCommand` + handler, consumed from `relayforge.events`: load the event's project subscriptions and their endpoints, filter out disabled endpoints, match patterns, and insert one Delivery row per match with `ON CONFLICT (event_id, endpoint_id) DO NOTHING` for redelivery safety
- [x] 8.3 Advance the Event to `PROCESSING` once Delivery rows are created, or directly to `COMPLETED` if none matched
- [x] 8.4 Publish one `relayforge.deliveries` message per newly created Delivery row, embedding the endpoint's URL/timeoutMs and the event's id/type/createdAt/data
- [x] 8.5 Commit the routing consumer's offset only after the DB insert and publish for that message both complete

## 9. Delivery Consumer (apps/delivery-worker)

- [x] 9.1 Implement the webhook request builder: `X-RelayForge-Event`, `-Event-Id`, `-Delivery-Id`, `-Timestamp` headers and the documented JSON body, honoring the message's `timeoutMs`
- [x] 9.2 Implement the HTTP POST call with a hard timeout matching `timeoutMs`
- [x] 9.3 On a `2xx` response, run the guarded raw-SQL update: `status = 'SUCCEEDED'`, `completed_at = now()`, `WHERE id = $1 AND status NOT IN ('SUCCEEDED','FAILED')`
- [x] 9.4 On a non-`2xx` response, unreachable endpoint, or timeout, run the same guarded update with `status = 'FAILED'`, `failed_at = now()`
- [x] 9.5 Run the events-aggregation statement: recompute the event's status from a `COUNT`-by-status subquery over its deliveries once none remain non-terminal, writing `COMPLETED`/`PARTIALLY_FAILED`/`FAILED`
- [x] 9.6 Commit the delivery consumer's offset only after both statements complete

## 10. Health Checks (apps/backend)

- [x] 10.1 Add `GET /health`, `/health/live`, `/health/ready` per §116
- [x] 10.2 `/health/ready` checks a live PostgreSQL connection and Kafka producer connectivity; `/health/live` checks process liveness only

## 11. Tests

- [x] 11.1 Unit test: event-type validator (well-formed accepted, malformed rejected)
- [x] 11.2 Unit test: payload-size guard (within limit accepted, over limit rejected)
- [x] 11.3 Unit test: `ApiKeyStrategy`/`ApiKeyAuthGuard` (valid key accepted, missing/malformed/unknown/revoked key rejected)
- [x] 11.4 Unit test: event-pattern matcher (exact, `*`, `prefix.*`, non-matching)
- [x] 11.5 Integration test (Supertest + live Kafka/Postgres): `POST /api/v1/events` → `202` → event persisted `PUBLISHED`, from `specs/events/spec.md`
- [x] 11.6 Integration test: full pipeline — register endpoint, subscribe, ingest a matching event → Delivery created → webhook received by a local test HTTP server → event reaches `COMPLETED`, from `specs/deliveries/spec.md`
- [x] 11.7 Integration test: disabled endpoint's subscription produces no Delivery
- [x] 11.8 Integration test: mixed success/failure across two endpoints for the same event → event reaches `PARTIALLY_FAILED`; all-failing case → `FAILED`
- [x] 11.9 Integration test: redelivering the same routed message does not create a duplicate Delivery; redelivering the same delivery-job message does not re-send a webhook

## 12. Verification

- [x] 12.1 Run migrations against the live `postgres` service and confirm they apply cleanly on top of the existing schema
- [x] 12.2 Manually exercise the full flow against `docker-compose`'s `postgres`/`kafka` with `apps/backend` and `apps/delivery-worker` run locally via `pnpm start:dev`: register endpoint, subscribe, `curl POST /api/v1/events`, observe the message on `kafka-ui`, confirm the webhook arrives and the Event/Delivery rows reach their terminal statuses
- [x] 12.3 Run `openspec validate event-ingestion-kafka-pipeline --strict` and fix any reported issues
