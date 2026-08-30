## Why

The dashboard has no landing screen: a user lands directly on a flat list page (Events, Endpoints, or Dead Letter Queue) with no way to see project-wide delivery health at a glance. The shell built by `dashboard-ui-ux-redesign` (permanent sidebar, project switcher, persistent chrome) was designed for a multi-section product, but today it only routes to three flat list pages, so the chrome reads as heavier than the content underneath it. That change's own design notes also described a compact icon-only navigation rail for desktop that was never implemented — the sidebar still renders full labels at every breakpoint regardless of viewport.

## What Changes

- Add a new project-scoped Overview page as the first navigation destination, showing at-a-glance delivery health: in-flight event count, events needing attention (failed/partially failed/dead-lettered), dead-letter queue backlog depth, endpoint enabled/disabled counts, and a recent-activity view, reusing the existing `AppMetricStrip` component and page-header rhythm from the redesign.
- Add a new backend endpoint, `GET /api/v1/projects/:projectId/summary`, that computes these aggregate counts server-side in one request, following the existing CQRS query-handler pattern and mandatory workspace/project ownership checks used by every other project-scoped endpoint.
- Restructure primary navigation to four items (Overview, Events, Dead Letter Queue, Endpoints) and finally implement the icon-only collapsing navigation rail on desktop (with tooltips) and full labeled drawer on mobile, replacing the always-labeled sidebar.
- No changes to the content, behavior, or visual language of the Events, Endpoints, Endpoint Detail, Event Detail, or Dead Letter Queue pages beyond the shared shell/navigation change above.

## Capabilities

### New Capabilities
- `dashboard-overview`: the Overview page itself — what it shows, how it's project-scoped, its loading/empty/error states, and its place in navigation.
- `project-delivery-summary`: the backend aggregate-summary endpoint that the Overview page consumes — response shape, project scoping, and ownership enforcement.

### Modified Capabilities
- `dashboard-ui-ux`: the "Dashboard shell provides strong navigation and orientation" requirement changes from a labeled sidebar at every breakpoint to an icon-only collapsing rail on desktop and a labeled drawer on mobile, across four navigation destinations instead of three.

## Impact

- **Backend**: new query handler + controller route under the existing `deliveries`/project-scoped module structure (or a new small module) computing counts via TypeORM query builder across events, deliveries, delivery_runs/attempts, and endpoints tables, scoped by `projectId` after the standard workspace ownership check. No schema/migration changes — read-only aggregate queries over existing tables.
- **Frontend**: new `Overview` page component + route, a new API hook/use case for the summary endpoint, updated `NAV_ITEMS` and `DashboardLayout` for the four-item icon rail, and reuse of the existing `AppMetricStrip`, `AppPageHeader`, and theme tokens from `dashboard-ui-ux-redesign`.
- **No changes** to authentication, project switching, delivery/idempotency behavior, or the DLQ/Events/Endpoints list/detail pages' own content.
