## Context

See `proposal.md` for motivation and `specs/dashboard-overview/spec.md`, `specs/project-delivery-summary/spec.md`, and `specs/dashboard-ui-ux/spec.md` for the behavior contracts.

Backend: NestJS + CQRS (`@nestjs/cqrs`), Postgres via TypeORM, migrations under `apps/backend/src/migrations/`. Every project-scoped query handler resolves `workspaceId` via `WorkspacesService.getWorkspaceIdForUser(userId)`, then `ProjectsRepository.findByIdInWorkspace(projectId, workspaceId)`, throwing `NotFoundException` if absent, before running any query (see `apps/backend/src/deliveries/queries/handlers/get-dlq.handler.ts`). List handlers either use the generic `paginate()` helper or a raw `SelectQueryBuilder` for join/filter-heavy cases; `get-dlq.handler.ts` is the closest precedent for cross-entity aggregation (it already joins events, endpoints, delivery_runs, delivery_attempts). No existing handler returns counts only — every one returns a paginated row set.

Frontend: React + Vite + MUI, layered as `core` (domain types) / `infrastructure` (`api/<Resource>` HTTP calls, `hooks/<Resource>` React Query hooks) / `presentation` (`hooks/<Resource>/use<Resource>Feature` combining hooks, `containers/<Resource>` wiring the feature hook to a pure `components/<Resource>` view). Routing lives in `App.tsx` as a flat `<Routes>` list; `/` currently redirects to `/events`. `DashboardLayout` renders one shared `NAV_ITEMS` list (from `DashboardLayout/consts.ts`) as a permanent MUI `Drawer` with full icon+label `ListItemButton`s at every breakpoint (`SIDEBAR_WIDTH === MOBILE_DRAWER_WIDTH === 280`) — this is the gap `dashboard-ui-ux-redesign`'s design.md named (a compact icon rail on desktop) but never implemented. The theme tokens (`relayForgeTokens`) and `AppMetricStrip` component from that change are reused here rather than re-derived.

## Goals / Non-Goals

**Goals:**
- One new backend endpoint computing all Overview counts + recent activity in a single request, reusing the existing CQRS/query-builder/ownership-check conventions exactly.
- One new frontend page following the existing `api -> hooks -> feature hook -> container -> component` layering already used by Events/Endpoints/DLQ.
- Replace the sidebar's always-labeled rendering with a real icon-only desktop rail / labeled mobile drawer, scoped strictly to `DashboardLayout` and `NAV_ITEMS`.

**Non-Goals:**
- No realtime/WebSocket push for summary data; the Overview page fetches on load and on project switch like every other page (matches `dashboard-shell`'s existing project-scoping requirement).
- No historical time-series charts or graphing library; counts are current-state snapshots plus a bounded recent-activity list, not trend visualization.
- No new database tables, columns, or migrations; the summary endpoint only reads existing `events`, `endpoints`, `deliveries`, `delivery_runs`, and `delivery_attempts` tables.
- No change to Events/Endpoints/Endpoint Detail/Event Detail/DLQ page content, filters, or tables — only the shared shell/nav changes touch them.

## Decisions

**1. One summary endpoint, computed with parallel scoped queries, not one giant join.**
`GET /api/v1/projects/:projectId/summary` is backed by a new `GetProjectSummaryQuery` + `GetProjectSummaryHandler`. Rather than one large multi-join query, the handler runs a small number of independently scoped `SelectQueryBuilder` count/list queries against `events`, `endpoints`, and `deliveries` (reusing the DLQ join shape from `get-dlq.handler.ts` for the backlog count and needs-attention count), all after the standard workspace/project ownership check, then assembles them into one response DTO. Independent queries are simpler to reason about, test, and index than one large aggregate join, and none of them are on a page-render-blocking path that needs sub-query-count minimization.

Alternative considered: a single SQL query with `COUNT(*) FILTER (WHERE ...)` across a multi-table join. Rejected for this first version — more efficient in theory, but harder to keep correct as event/delivery status enums evolve, and premature given current data volumes.

**2. Response shape is flat counts + a bounded recent-activity list, not per-status breakdowns.**
`ProjectSummaryResponseDto`:
```
{
  inFlightCount: number;        // events with status ACCEPTED | PUBLISHED | PROCESSING
  needsAttentionCount: number;  // events with status PARTIALLY_FAILED | FAILED (DEAD_LETTERED is a delivery status, not an event status; already covered by dlqBacklogCount)
  dlqBacklogCount: number;      // deliveries with status DEAD_LETTERED
  endpoints: { enabled: number; disabled: number };
  recentActivity: Array<{
    eventId: string;
    eventType: string;
    status: string;
    isTest: boolean;
    createdAt: string;
  }>;
}
```
`inFlightCount`/`needsAttentionCount` status groupings match the ones already used client-side in `Events/index.tsx`'s `AppMetricStrip` usage, so the same semantics carry over instead of introducing a second definition of "needs attention." `recentActivity` reuses the existing `events` list ordering (`createdAt DESC`), bounded to a fixed limit (10), to keep the endpoint fast and the page simple — it is not a second paginated feed.

Alternative considered: returning per-endpoint or per-status-code breakdowns. Rejected as scope creep beyond an at-a-glance summary; users needing that detail already have the Events/Endpoints/DLQ pages with full filtering.

**3. New `dashboard-summary` backend module, not an addition to `deliveries` or `events`.**
The summary handler queries across events, endpoints, and deliveries, so it doesn't belong to any single existing resource module. A small new module (`apps/backend/src/dashboard-summary/`) owns the controller, query, and handler, injecting the `EventEntity`, `EndpointEntity`, and `DeliveryEntity` repositories it needs plus `WorkspacesService`/`ProjectsRepository` for the ownership check — the same dependency shape `get-dlq.handler.ts` already has, just without adding a cross-cutting summary concern into the `deliveries` module's existing responsibility (delivery routing, replay, DLQ listing).

Alternative considered: adding a `summary` query handler inside the `deliveries` module. Rejected because the summary also needs endpoint counts, which would make `deliveries` reach into `endpoints`' entities for a concern that isn't about deliveries specifically.

**4. Frontend Overview page follows the existing resource layering exactly.**
New `infrastructure/api/DashboardSummary` (HTTP call), `infrastructure/hooks/DashboardSummary` (React Query hook, keyed by project id so it refetches on project switch exactly like other resources), `presentation/hooks/Overview/useOverviewFeature` (feature hook), `presentation/containers/Overview` (wiring), `presentation/components/Overview` (pure view assembling `AppPageHeader` + `AppMetricStrip` + a recent-activity list, using `AppSkeleton` for loading and existing empty/error patterns from Events/Endpoints). New route `/overview` added to `App.tsx` inside `AuthGuard`/`DashboardLayout` exactly like the other authenticated routes; `/` redirect target changes from `/events` to `/overview`.

**5. Navigation shows icon + label at every breakpoint; the icon-only desktop rail was reverted.**
`NAV_ITEMS` gains an `Overview` entry (first in the array) with its icon. An icon-only collapsing desktop rail (icons only, `Tooltip`/`aria-label` for the name) was built first, per the modified `dashboard-ui-ux` spec at the time, but direct user feedback after seeing it running rejected it outright ("the sidebar looks shit") as part of a broader push for a simpler, flatter shell. `DashboardLayout` now renders the same icon+`ListItemText` navigation at every breakpoint; only the drawer's presentation (permanent sidebar vs. dismissible mobile drawer) differs by viewport. The `dashboard-ui-ux` delta spec above was updated to match. `SIDEBAR_WIDTH` (232px) is a single constant again; `MOBILE_DRAWER_WIDTH` was removed since the mobile drawer now reuses the same width.

Alternative considered (superseded): an icon-only rail with tooltips, and before that, an expand-on-hover rail. Both rejected — the former per direct feedback that it hurt readability more than it saved space at only four destinations.

## Risks / Trade-offs

- **[Multiple independent queries per summary request add backend round-trips]** -> Mitigation: all queries are simple, indexed-by-`project_id` counts/limits, not joins across large unbounded sets; acceptable for current data volumes, and the design isolates them behind one handler so they can be consolidated later without changing the response contract.
- **[Icon-only rail regressed readability]** -> Realized, not just a risk: shipped once, then reverted after direct user feedback in favor of icon+label navigation at every breakpoint (see Decision 5).
- **[Changing the `/` redirect target changes first-load behavior for existing bookmarks/tests]** -> Mitigation: `/events` route itself is untouched, so direct links keep working; only the bare `/` redirect changes destination, and relevant frontend tests/e2e assertions on redirect behavior get updated alongside the change.
- **[Recent-activity list duplicates some of what Events already shows]** -> Mitigation: it is explicitly bounded and non-paginated (a glance, not a feed), and links through to the same Event Detail route Events already uses, so it doesn't introduce a second source of truth for event data.

## Migration Plan

1. Backend: add `dashboard-summary` module (query, handler, controller, DTO), register it in the root app module, add tests for ownership enforcement and count correctness.
2. Frontend: add API/hook/feature-hook/container/component layers for Overview, following the Events/Endpoints precedent.
3. Update `NAV_ITEMS`, `DashboardLayout` (icon-only desktop rail / labeled mobile drawer), and `App.tsx` routing (`/overview` route, `/` redirect target).
4. Update existing frontend tests/specs referencing the sidebar's always-labeled rendering or the `/` -> `/events` redirect.
5. Run backend and frontend build/test suites; manually smoke-test Overview at desktop and narrow viewports, including project switching.

Rollback is straightforward: the summary endpoint is additive and read-only (no migrations), and the frontend changes are new route/nav additions plus a `DashboardLayout` rendering change — reverting the commit(s) restores prior behavior with no data implications.
