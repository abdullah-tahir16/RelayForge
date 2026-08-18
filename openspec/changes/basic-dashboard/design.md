## Context

`apps/frontend` is still `.gitkeep` — no code, no tooling choice made anywhere in the repo. Every backend list endpoint shipped so far (`projects`, `endpoints`, `api-keys`, `subscriptions`) returns a bare, unpaginated array; `events`/`deliveries` have no read-side at all. No capability has ever been archived, so `openspec/specs/` has no baseline — this change's deltas for already-existing capabilities are written as `## ADDED Requirements` rather than `## MODIFIED Requirements`, a deliberate choice made in exploration (see proposal.md) rather than blocking on archiving five changes first. See `proposal.md` for motivation and `specs/*/spec.md` for the exact behavior contract.

Everything in this design was settled in exploration before this proposal was written: offset/limit pagination (not cursor-based), pagination+filtering retrofitted across every list endpoint rather than just the two new ones, a login screen included, and endpoint/subscription management UI included per `documentation.md`'s own placement of the Endpoint Form alongside the Events Screen.

## Goals / Non-Goals

**Goals:**
- Stand up `apps/frontend` following `documentation.md` §83-96's architecture and wrapper conventions.
- Ship one consistent pagination + filter query contract used by every list endpoint in `apps/backend`, present and future.
- Give the dashboard's read screens the HTTP outcome data (`delivery-worker` already computes it, just drops it).
- Satisfy every requirement across the nine capability deltas this change adds.

**Non-Goals:**
- No real-time updates — `realtime-websockets` (Phase 4). Screens are refetch/poll via TanStack Query, not pushed.
- No free-text/ID search bar (`documentation.md` §60 "Search") — only the structured filters §61 specifies. Search is a separate, later concern from filtering.
- No analytics widgets (§58-59) — they need DLQ count and retry data that don't exist yet; no home on the roadmap at all currently.
- No audit log — `audit-logs` (Phase 4).
- No full HTTP request/response inspector (§54) — only status code and duration are captured this change; headers, request/response bodies, and their redaction rules are a later, separable concern once something actually stores them.
- No `apps/frontend` Dockerfile — same as the other two apps.
- No cursor-based pagination — offset/limit throughout, a deliberate simplicity choice (see Decisions).

## Decisions

**1. Dashboard reads use JWT auth + workspace/project ownership, never the API-key guard.**
`ApiKeyAuthGuard` (from `event-ingestion-kafka-pipeline`) exists for machine-to-machine event ingestion. Every new read endpoint in this change (`GET /events`, `GET /events/:id`, `GET /deliveries`, the endpoint lookup) is a human dashboard user acting through a browser session, so they use `JwtAuthGuard` plus the same `workspace → project` ownership check every other authenticated query in this codebase already uses.

**2. A shared pagination contract: `PaginationQueryDto` + a generic envelope, not six bespoke implementations.**
One `{ page?: number; pageSize?: number }` DTO (with class-validator bounds and defaults) and one small helper wrapping TypeORM's `findAndCount`, returning `{ items, total, page, pageSize }`. Every retrofitted list query (`projects`, `endpoints`, `api-keys`, `subscriptions`) and both new ones (`events`, `deliveries`) use it, so the contract is genuinely one shape, not six similar-but-slightly-different ones.
*Alternative considered:* cursor-based (keyset) pagination. Rejected for now — simpler to implement uniformly across six endpoints at once, and nothing in this project has event volume yet that makes offset drift under concurrent writes a real problem. Revisit if it becomes one.

**3. Breaking the four existing endpoints' response shape is accepted outright, not versioned.**
No external consumer of `GET /projects`, `GET /endpoints`, `GET /api-keys`, or `GET /subscriptions` exists yet — the dashboard being built in this same change is the only consumer. Their e2e specs (`projects`, `endpoints`, `api-keys`, `subscriptions`.e2e-spec.ts) are updated to assert the envelope shape as part of this change's own task list, not left broken.

**4. Filtering events by endpoint, and scoping deliveries by project, both require a join — `events`/`deliveries` have no relation decorators.**
Per the existing convention (plain FK columns, no `@ManyToOne`/`@JoinColumn`, established in `endpoint-and-subscription-minimal`'s design), both need a manual `QueryBuilder` join rather than `relations: [...]`:
- Events filtered by `endpointId`: `EXISTS (SELECT 1 FROM deliveries WHERE deliveries.event_id = events.id AND deliveries.endpoint_id = :endpointId)`.
- Deliveries scoped by project: join `deliveries.endpoint_id = endpoints.id AND endpoints.project_id = :projectId`, since `deliveries` has no `projectId` column of its own.

**5. Delivery HTTP outcome: two nullable columns, populated where the data already exists.**
`deliveries` gains `http_status_code` (nullable int) and `duration_ms` (nullable int). `apps/delivery-worker`'s `DeliveryConsumerService` already receives a `statusCode` from `WebhookSenderService.send()` and discards it; this change times the call (`Date.now()` before/after `fetch`) and passes both values into `DeliveriesSqlRepository.resolveDelivery`, which already runs the guarded `UPDATE` — two more columns in the same statement, no new query.

**6. No project lookup endpoint — the project switcher uses the regular paginated list.**
Unlike endpoints (which need an unpaginated lookup because a filter dropdown must show every option, not just page one), a project switcher showing a generously-sized single page (e.g. `pageSize=100`) is enough for how many projects a single workspace realistically has today. Team workspaces with real multi-tenant project sprawl are `workspaces-and-team-rbac`'s problem (Phase 4), not this change's.
*Alternative considered:* a `/projects/lookup` endpoint mirroring the endpoint one. Rejected — no concrete case today where a workspace has enough projects for one page to not be "every project."

**7. Event timeline is synthesized from existing timestamps, not a new history table.**
`documentation.md` §51 wants a "Timeline" section. Nothing in this codebase records a status-change history — only `events.createdAt/publishedAt` and each `deliveries.createdAt/completedAt/failedAt`. The event detail screen's timeline is those timestamps sorted chronologically, not a dedicated audit trail. A real per-status-transition history is `audit-logs`' problem (Phase 4), not this change's.

**8. Frontend bootstrap: Vite.**
`docker-compose.yml` already maps port `5173` for the `frontend` service — Vite's default dev port, and distinct from `apps/backend`'s `3000`. No other bundler is named anywhere in the doc or `LLM_CONTEXT.md`.

## Risks / Trade-offs

- **[This is by far the largest single change in the repo's history — 9 capability deltas, a breaking change to 4 shipped endpoints, and the first frontend code, all in one change]** → Mitigation: explicitly and repeatedly directed this way across exploration rather than split by whoever scoped this; `tasks.md` is organized into clearly separable groups (backend pagination retrofit, new read endpoints, delivery-worker schema fix, frontend bootstrap, each screen) so it can still be built and reviewed incrementally even though it archives as one change.
- **[Deltas for already-existing capabilities are `ADDED`, not `MODIFIED`, because no archived baseline exists]** → Mitigation: a deliberate, explicit choice (see proposal.md) over blocking this change on archiving five others first. Whoever archives `event-ingestion-kafka-pipeline`/`endpoint-and-subscription-minimal`/`project-and-api-key-minimal` and this change will need to reconcile requirement text by hand if they land in an order the tooling didn't anticipate.
- **[Offset/limit pagination can drift under concurrent writes]** → Mitigation: accepted per Decision 2; revisit with cursor-based pagination if event volume ever makes it a real, observed problem rather than a theoretical one.
- **[No endpoint success-rate or last-delivery-time shown anywhere, despite `documentation.md` §56 showing it prominently]** → Mitigation: deliberate — computing that aggregate now, with no analytics capability or DLQ data behind it yet, is exactly the kind of code-with-no-real-caller this project has consistently avoided building early.
