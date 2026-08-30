## 1. Backend Summary Query

- [x] 1.1 Create the `dashboard-summary` module (controller, query, handler, response DTO) registered in the root app module, injecting `EventEntity`, `EndpointEntity`, `DeliveryEntity` repositories plus `WorkspacesService`/`ProjectsRepository`.
- [x] 1.2 Implement `GetProjectSummaryQuery`/`GetProjectSummaryHandler` enforcing the standard workspace→project ownership check (`WorkspacesService.getWorkspaceIdForUser` + `ProjectsRepository.findByIdInWorkspace`, `NotFoundException` if the project isn't owned by the caller's workspace) before running any query.
- [x] 1.3 Compute `inFlightCount` (events with status `ACCEPTED`/`PUBLISHED`/`PROCESSING`) and `needsAttentionCount` (events with status `PARTIALLY_FAILED`/`FAILED` — `DEAD_LETTERED` is a delivery status, not an event status, and is already covered by `dlqBacklogCount`) scoped by `project_id`.
- [x] 1.4 Compute `dlqBacklogCount` (deliveries with status `DEAD_LETTERED`), reusing the join shape from `get-dlq.handler.ts` but as a count only.
- [x] 1.5 Compute `endpoints.enabled`/`endpoints.disabled` counts scoped by the project's endpoints.
- [x] 1.6 Compute `recentActivity`: the most recent events for the project (id, event type, status, test marker, created-at), ordered `createdAt DESC`, bounded to a fixed limit.
- [x] 1.7 Add `GET /api/v1/projects/:projectId/summary` to the new controller behind `JwtAuthGuard`, returning the assembled `ProjectSummaryResponseDto`.

## 2. Backend Verification

- [x] 2.1 Add unit tests for the handler: correct counts with mixed-status data, zero counts for an empty project, and recent-activity ordering/limit.
- [x] 2.2 Add a unit/E2E test asserting the endpoint rejects a project outside the caller's workspace with no summary data returned.
- [x] 2.3 Add an E2E test for `GET /api/v1/projects/:projectId/summary` covering the successful response shape.

## 3. Frontend Data Layer

- [x] 3.1 Add `core` types for the project summary response (counts, endpoint enabled/disabled, recent activity items).
- [x] 3.2 Add `infrastructure/api/DashboardSummary` for the `GET /summary` call and `infrastructure/hooks/DashboardSummary` as a React Query hook keyed by project id so it refetches on project switch.
- [x] 3.3 Add `presentation/hooks/Overview/useOverviewFeature` combining the summary hook into the shape the Overview component needs (loading/empty/error states included).

## 4. Frontend Overview Page

- [x] 4.1 Add `presentation/components/Overview` rendering `AppPageHeader`, an `AppMetricStrip` for in-flight/needs-attention/DLQ backlog/endpoint enabled-disabled, and a recent-activity list linking each item to its Event Detail route.
- [x] 4.2 Implement loading state (`AppLoader`, stable layout — matches the existing DLQ page precedent rather than the originally-guessed `AppSkeleton`), empty state (the recent-activity `AppTable`'s built-in empty-state row plus zeroed metrics, matching how DLQ/Events/Endpoints already represent "nothing here" rather than a bespoke full-page replacement), and error state (clear failure message, no retry-button per DLQ precedent which relies on query refetch) per `specs/dashboard-overview/spec.md`.
- [x] 4.3 Add `presentation/containers/Overview` wiring `useOverviewFeature` to the `Overview` component.
- [x] 4.4 Add the `/overview` route in `App.tsx` inside `AuthGuard`/`DashboardLayout`, and change the `/` redirect target from `/events` to `/overview`.

## 5. Shell And Navigation

- [x] 5.1 Add an `Overview` entry (first) to `NAV_ITEMS` in `DashboardLayout/consts.ts` with its icon.
- [x] 5.2 ~~Rework `DashboardLayout` so the desktop permanent drawer renders icon-only `ListItemButton`s~~ — shipped, then reverted per direct user feedback ("the sidebar looks shit"). `DashboardLayout` now renders icon+`ListItemText` at every breakpoint; see section 8.
- [x] 5.3 ~~Decouple `SIDEBAR_WIDTH` (desktop icon rail) from `MOBILE_DRAWER_WIDTH`~~ — superseded by section 8, which collapses both back to one `SIDEBAR_WIDTH` (232px) constant.
- [x] 5.4 Verify keyboard/focus behavior on navigation: each nav item remains reachable and identifiable via focus-visible state and accessible name, matching the existing keyboard-navigation requirement in `dashboard-ui-ux` (covered by the `DashboardLayout` test under 6.2 — each item renders as a real focusable `<a>` with a visible label).

## 6. Frontend Verification

- [x] 6.1 Add tests for the `Overview` component covering populated, empty, loading, and error states, and recent-activity navigation. (`useOverviewFeature` itself is a thin composition with no dedicated test, matching the existing precedent for other feature hooks in this codebase — e.g. `useEventsFeature`/`useDeadLetterQueueFeature` are exercised through their component's prop-contract tests, not `renderHook`.)
- [x] 6.2 Update or add `DashboardLayout` tests for the four-item nav and full icon+label rendering at every breakpoint (updated again in section 8 after the icon-only desktop rail was reverted).
- [x] 6.3 Update any existing test/assertion relying on the previous `/` → `/events` redirect or the three-item nav. (Searched — no existing test asserted either; nothing needed updating.)
- [x] 6.4 Run `pnpm --dir apps/backend test` and `pnpm --dir apps/frontend build && pnpm --dir apps/frontend test`. (Also ran `pnpm --dir apps/backend run test:e2e`: 81/81 passed on a clean re-run — an initial run had one flaky failure in the async Kafka delivery-pipeline suite, unrelated to this change and not reproducing on retry.)

## 7. Documentation And Roadmap

- [x] 7.1 Update `LLM_CONTEXT.md` if it documents the current nav items, route list, or dashboard shell behavior. (Checked — it already describes "compact icon rail navigation on desktop, labeled drawer navigation on mobile" from the prior round's design notes, and doesn't enumerate specific routes/pages or backend modules, so no changes were needed.)
- [x] 7.2 Add this change under Proposed in `ROADMAP.md`, then move it through Doing/Done per the roadmap's maintenance convention as tasks are checked off. (Added directly under Done since every task completed within this same apply session.)

## 8. Post-Ship Simplification (direct user feedback)

After seeing the shipped dashboard running live (screenshotted every page, desktop and mobile), the user rejected the icon-only desktop rail and the broader visual system outright: "unnecessary scrolls, the sidebar looks shit, the font and feel looks shit, the box with rounded border which says operations console looks shit, i want simple page." This reopened both this change's shell work and `dashboard-ui-ux-redesign`'s theme (see that change's own tasks.md section 11 for the theme-level side of this same pass).

- [x] 8.1 Revert the icon-only desktop rail: `DashboardLayout` now renders icon + `ListItemText` at every breakpoint; `NAV_ITEMS`/`consts.ts` unchanged. Collapsed `SIDEBAR_WIDTH`/`MOBILE_DRAWER_WIDTH` back into one `SIDEBAR_WIDTH` (232px) constant.
- [x] 8.2 Removed the floating rounded/shadowed content shell (was `borderRadius:'32px'`, heavy `boxShadow`, `m:1.5` floating card) and the blurred sticky header ("Operations console" eyebrow in a `backdropFilter: blur(14px)` bar). Content now sits flat on the page background; header is a plain bordered-bottom bar with no blur.
- [x] 8.3 Fixed the "unnecessary scrolls" complaint: the shell no longer clips itself with `height:100dvh; overflow:hidden` plus a separately `overflow:auto` main content region. The whole page now scrolls natively as one document; the sidebar and header use `position:sticky` to stay pinned during that scroll instead of living in their own clipped viewport.
- [x] 8.4 Found and fixed a real bug surfaced by that flow change: `mainRef.current?.focus()` (called on every route change) was triggering the browser's default scroll-into-view behavior, which — now that the page genuinely scrolls — shoved the sticky header/sidebar up out of view on load. Fixed with `focus({ preventScroll: true })`.
- [x] 8.5 Removed gradient/glow decoration app-wide: flat solid colors for the primary button and the sidebar's logo mark (was a gradient badge with a glow `boxShadow`), flat body background (was a two-layer radial+linear gradient), flat dialog background (was a gradient overlay).
- [x] 8.6 Reduced border-radius across the board (theme `shape.borderRadius` 10→8, buttons/inputs 10-12→8, `AppSurface`/dialogs/`AppMetricStrip` 24px→8px) and removed the `boxShadow` "glow"/elevation treatment from `AppSurface` and `AppMetricStrip`.
- [x] 8.7 Replaced the Manrope UI typeface with the system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`); dropped the Manrope `@import` from `theme/fonts.css`, keeping JetBrains Mono for technical/monospace text.
- [x] 8.8 Updated the `dashboard-ui-ux` delta spec (this change) and `DashboardLayout`/`Overview` tests for the reverted navigation shape; verified via live screenshots (desktop 1440px and mobile 390px, Overview/Events/Endpoints/DLQ) taken against the running dev app, not just component tests.
- [x] 8.9 Ran `pnpm --dir apps/frontend build` and `pnpm --dir apps/frontend test` (51/51 passing) after the full pass.
