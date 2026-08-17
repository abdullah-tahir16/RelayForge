## 1. Database Schema & Migrations

- [x] 1.1 Add `endpoints` TypeORM entity + migration (id, projectId, name, url, description, enabled, timeoutMs, disabledAt, createdAt, updatedAt), `projectId` with `ON DELETE CASCADE`
- [x] 1.2 Add `subscriptions` TypeORM entity + migration (id, endpointId, eventPattern, createdAt), `endpointId` with `ON DELETE CASCADE`

## 2. URL & Pattern Validation

- [x] 2.1 Implement an endpoint URL validator: syntactically valid, `http`/`https` scheme only, rejects literal loopback/link-local hostnames (`localhost`, `127.0.0.1`, `169.254.169.254`, equivalents)
- [x] 2.2 Implement an event-pattern validator: literal `*`, or dot-separated lowercase alphanumeric segments with an optional trailing `.*`
- [x] 2.3 Implement timeout bounds validation: default 10000ms, reject values above 30000ms

## 3. Endpoints Domain (CQRS)

- [x] 3.1 Implement `RegisterEndpointCommand` + handler: resolves caller's workspace, verifies project ownership, validates URL/timeout, persists the endpoint enabled
- [x] 3.2 Implement `GetEndpointsQuery` + handler: lists endpoints scoped to a project the caller owns
- [x] 3.3 Implement `GetEndpointQuery` + handler: fetches one endpoint, 404 if it belongs to another workspace
- [x] 3.4 Implement `UpdateEndpointCommand` + handler: updates name/description/url/timeout with the same validation as registration, 404 if another workspace's endpoint
- [x] 3.5 Implement `EnableEndpointCommand` + handler: sets enabled=true, clears disabledAt
- [x] 3.6 Implement `DisableEndpointCommand` + handler: sets enabled=false, sets disabledAt
- [x] 3.7 Implement `DeleteEndpointCommand` + handler: deletes the endpoint; confirm the DB cascade removes its `subscriptions` rows

## 4. Endpoints API

- [x] 4.1 Wire `POST /api/v1/projects/:projectId/endpoints` (guarded) to `RegisterEndpointCommand`
- [x] 4.2 Wire `GET /api/v1/projects/:projectId/endpoints` (guarded) to `GetEndpointsQuery`
- [x] 4.3 Wire `GET /api/v1/endpoints/:id` (guarded) to `GetEndpointQuery`
- [x] 4.4 Wire `PATCH /api/v1/endpoints/:id` (guarded) to `UpdateEndpointCommand`
- [x] 4.5 Wire `POST /api/v1/endpoints/:id/enable` (guarded) to `EnableEndpointCommand`
- [x] 4.6 Wire `POST /api/v1/endpoints/:id/disable` (guarded) to `DisableEndpointCommand`
- [x] 4.7 Wire `DELETE /api/v1/endpoints/:id` (guarded) to `DeleteEndpointCommand`

## 5. Subscriptions Domain (CQRS)

- [x] 5.1 Implement `SubscribeEndpointCommand` + handler: verifies caller owns the endpoint's project, validates the pattern, persists the subscription
- [x] 5.2 Implement `GetSubscriptionsQuery` + handler: lists subscriptions for an endpoint the caller owns
- [x] 5.3 Implement `UnsubscribeCommand` + handler: verifies caller owns the subscription's endpoint's project, deletes it

## 6. Subscriptions API

- [x] 6.1 Wire `POST /api/v1/endpoints/:id/subscriptions` (guarded) to `SubscribeEndpointCommand`
- [x] 6.2 Wire `GET /api/v1/endpoints/:id/subscriptions` (guarded) to `GetSubscriptionsQuery`
- [x] 6.3 Wire `DELETE /api/v1/subscriptions/:id` (guarded) to `UnsubscribeCommand`

## 7. Tests

- [x] 7.1 Unit test: URL validator (valid http/https, malformed rejected, non-http(s) scheme rejected, each blocklisted literal rejected)
- [x] 7.2 Unit test: event-pattern validator (exact type, single wildcard, bare `*` accepted; malformed patterns rejected)
- [x] 7.3 Unit test: timeout bounds (default applied, over-max rejected)
- [x] 7.4 Integration test (Supertest): endpoint register → list → get → update → enable/disable → delete, including cross-workspace 404s and cascade-delete of its subscriptions, from `specs/endpoints/spec.md`
- [x] 7.5 Integration test (Supertest): subscription create → list → unsubscribe, including malformed-pattern rejection and cross-workspace 404s, from `specs/subscriptions/spec.md`

## 8. Verification

- [x] 8.1 Run migrations against the live `postgres` service and confirm they apply cleanly on top of the existing schema
- [x] 8.2 Manually exercise the full flow with curl: create project (existing) → register endpoint → subscribe to `order.*` → list → disable → delete endpoint (confirm subscription gone)
- [x] 8.3 Run `openspec validate endpoint-and-subscription-minimal --strict` and fix any reported issues
