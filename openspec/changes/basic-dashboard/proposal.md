## Why

Every capability shipped so far (`auth-minimal` through `event-ingestion-kafka-pipeline`) is API-only — there is no frontend at all (`apps/frontend` is still a `.gitkeep`), and no way to see an event, a delivery, or even configure an endpoint without `curl`. This change gives RelayForge its first real UI: the dashboard `ROADMAP.md` calls out as the last Phase 1 item, standing up `apps/frontend` for the first time, per `documentation.md` §83-100's frontend architecture and §50-63's dashboard/UI vision.

## What Changes

- **Frontend app bootstrap** (first real code in `apps/frontend`): Vite + React + TypeScript, the `core/infrastructure/presentation` layering from §83-90, a single centralized Material UI theme (§95), the `App*` component wrappers (§92) and `Form*` wrappers (§93-94) needed by the screens below, and a toast/snackbar notification system (`AppSnackbar` + a `useToast` hook) for feedback on every mutation this change introduces.
- **Login screen and route guard**: a login form against `auth-minimal`'s existing `/api/v1/auth/login`, token storage, and a route guard wrapping the dashboard — the first UI for an API that has existed since `auth-minimal` with none.
- **Project selection**: a minimal project switcher, since every screen below is scoped to a project and nothing in the frontend has ever needed to pick one before.
- **Events screens**: an events list (type, created-at, status, delivery count — `documentation.md` §98) and an event detail view (Payload / Deliveries / Timeline sections, §51) with a payload viewer scoped to pretty-print, copy, and raw-JSON toggle (§52) — search-within-JSON and virtualized rendering for very large payloads are explicitly deferred.
- **Endpoint and subscription management screens**: endpoint list/detail/create/edit forms (§56-57, §99 — name, URL, description, timeout, enabled) and subscription management (subscribe/list/unsubscribe) nested under an endpoint's detail view, using `documentation.md`'s own placement of the Endpoint Form directly alongside the Events Screen in its frontend architecture section rather than the narrower one-line scope `ROADMAP.md` had carried until this proposal.
- **`GET /api/v1/events` and `GET /api/v1/events/:id`**: new read-side query endpoints for the `events` capability — the first time anything reads an Event back. List supports pagination and the filters `documentation.md` §61 specifies for events (event type, status, created-date range, endpoint).
- **`GET /api/v1/deliveries`**: new read-side query endpoint for the `deliveries` capability, scoped by project, supporting pagination and §61's delivery filters (status, endpoint, HTTP status, date).
- **Delivery HTTP outcome persisted**: `deliveries` gains `httpStatusCode` and `durationMs` columns, populated by `apps/delivery-worker`'s existing webhook call (`WebhookSenderService` already computes a status code today; it was simply discarded). Without this, the HTTP-status delivery filter and the delivery detail view have nothing to show or filter on.
- **`GET /api/v1/projects/:projectId/endpoints/lookup`**: a new, deliberately unpaginated endpoint-lookup query (id + name only) so filter dropdowns and the subscription form's endpoint picker aren't limited to whatever fits on one page of the now-paginated endpoint list.
- **BREAKING: pagination retrofit across every existing list endpoint.** `GET /projects`, `GET /projects/:projectId/endpoints`, `GET /projects/:projectId/api-keys`, and `GET /endpoints/:id/subscriptions` all change response shape from a bare array to `{ items, total, page, pageSize }`. Offset/limit pagination throughout (not cursor-based) — simpler, and consistent with adding the same shape everywhere at once rather than mixing two pagination styles across the API. This breaks the existing e2e assertions in `endpoints.e2e-spec.ts`, `api-keys.e2e-spec.ts`, `subscriptions.e2e-spec.ts`, and `projects.e2e-spec.ts`, which get updated as part of this change.
- **No new filters invented for `projects`, `api-keys`, or `subscriptions` list endpoints.** They gain pagination only — `documentation.md` never specifies filter criteria for them, and inventing filter fields nobody asked for would be exactly the kind of dead code this project has consistently avoided (the wildcard-matcher and API-key-guard deferrals being the clearest precedents).
- **No `apps/frontend` Dockerfile.** Matches `apps/backend`/`apps/delivery-worker`: runs via `pnpm --filter frontend dev` against `docker-compose`'s already-mapped port 5173, same as every other app so far.

## Capabilities

### New Capabilities
- `dashboard-shell`: the frontend application bootstrap — theme, navigation, login screen, auth route guard, project selection, and the toast-notification system every mutation screen depends on.
- `events-dashboard`: events list and event detail screens (payload viewer, deliveries section, timeline).
- `endpoint-management-ui`: endpoint list/detail/create/edit screens and subscription management, the first UI over the `endpoints`/`subscriptions` capabilities' existing API.

### Modified Capabilities
- `events`: adds list (`GET /api/v1/events`, paginated and filterable) and get-by-id (`GET /api/v1/events/:id`) query requirements to the capability `event-ingestion-kafka-pipeline` shipped ingestion-only.
- `deliveries`: adds a list query (`GET /api/v1/deliveries`, paginated and filterable) and the requirement that a delivery's HTTP status code and duration are recorded, not just its terminal status.
- `endpoints`: the list requirement becomes paginated; adds an unpaginated lookup query for populating filter/picker UI.
- `subscriptions`: the list requirement becomes paginated.
- `api-keys`: the list requirement becomes paginated.
- `projects`: the list requirement becomes paginated.

## Impact

- First real code in `apps/frontend`; first Dockerfile-less-but-real frontend dev workflow, matching the other two apps.
- Breaking response-shape change to four already-shipped, already-tested endpoints (see above) — their e2e specs are updated, not just their handlers.
- New `deliveries` columns (`http_status_code`, `duration_ms`), populated by a small `apps/delivery-worker` change to stop discarding data `WebhookSenderService` already computes.
- New shared pagination/filter query-parameter contract used by every list endpoint in `apps/backend` going forward.
