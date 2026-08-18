## 1. Shared Pagination Infrastructure (apps/backend)

- [x] 1.1 Add `common/pagination/pagination-query.dto.ts`: `page` (default 1, min 1) and `pageSize` (default 25, min 1, max 100), both optional, class-validator bounded
- [x] 1.2 Add `common/pagination/paginate.ts`: a helper wrapping TypeORM's `findAndCount`/`getManyAndCount`, returning `{ items, total, page, pageSize }`
- [x] 1.3 Add `common/pagination/paginated-response.dto.ts`: the generic envelope interface

## 2. Backend: Retrofit Existing List Endpoints

- [x] 2.1 `GET /api/v1/projects`: accept `PaginationQueryDto`, return the envelope
- [x] 2.2 `GET /api/v1/projects/:projectId/endpoints`: accept `PaginationQueryDto`, return the envelope
- [x] 2.3 `GET /api/v1/projects/:projectId/api-keys`: accept `PaginationQueryDto`, return the envelope (masking rules unchanged)
- [x] 2.4 `GET /api/v1/endpoints/:id/subscriptions`: accept `PaginationQueryDto`, return the envelope
- [x] 2.5 Update `GetProjectsQuery`/`GetEndpointsQuery`/`GetApiKeysQuery`/`GetSubscriptionsQuery` handlers to use the `paginate` helper against their existing repositories (direct repository injection, not the wrapper classes — `SubscriptionsRepository.findAllByEndpointId` stays untouched since `RouteEventHandler` depends on it unpaginated)

## 3. Backend: Endpoint Lookup

- [x] 3.1 Add `GetEndpointsLookupQuery` + handler: returns every enabled-or-disabled endpoint's `{id, name}` for a project the caller owns, no pagination
- [x] 3.2 Wire `GET /api/v1/projects/:projectId/endpoints/lookup` (guarded); no path-collision risk in practice since it's nested under `/projects/:projectId/endpoints/`, a different prefix than `/endpoints/:id`

## 4. Database Schema & Migrations

- [x] 4.1 Add `http_status_code` (nullable int) and `duration_ms` (nullable int) columns to `deliveries` via migration

## 5. delivery-worker: Persist HTTP Outcome

- [x] 5.1 Time each webhook attempt (`Date.now()` before/after `fetch`) in `DeliveryConsumerService.processDelivery`
- [x] 5.2 Extend `DeliveriesSqlRepository.resolveDelivery` to accept and write `httpStatusCode` (nullable) and `durationMs`
- [x] 5.3 Pass `WebhookSenderService.send()`'s already-computed `statusCode` through instead of discarding it

## 6. Backend: Events Read API

- [x] 6.1 Implement `GetEventsQuery` + handler: paginated, filters `eventType`/`status`/`createdFrom`/`createdTo`/`endpointId` (endpoint filter via `EXISTS` subquery against `deliveries`, per design Decision 4), scoped to the caller's workspace via project ownership. Also computes per-event delivery total/succeeded counts (a second grouped aggregate query over just the returned page's event ids) since the events-dashboard spec requires them in the list
- [x] 6.2 Implement `GetEventQuery` + handler: fetch one event by id, 404 if outside caller's workspace
- [x] 6.3 Wire `GET /api/v1/projects/:projectId/events` and `GET /api/v1/events/:id` (both `JwtAuthGuard`) via a new `EventsQueryController` alongside the existing API-key-guarded `EventsController` — one controller can't mix guards per-route cleanly, so the read side got its own controller in the same module

## 7. Backend: Deliveries Read API

- [x] 7.1 Implement `GetDeliveriesQuery` + handler: paginated, filters `status`/`endpointId`/`httpStatusCode`/`eventId`/date range, scoped to the caller's workspace via a join through `endpoints.project_id` (design Decision 4)
- [x] 7.2 Wire `GET /api/v1/projects/:projectId/deliveries` (`JwtAuthGuard`) via a new `DeliveriesQueryController` in the existing `deliveries` module

## 8. Backend Tests

- [x] 8.1 Unit test: `paginate` helper (defaults applied, bounds enforced, envelope shape)
- [x] 8.2 Update `projects.e2e-spec.ts`, `endpoints.e2e-spec.ts`, `api-keys.e2e-spec.ts`, `subscriptions.e2e-spec.ts` assertions from bare-array to envelope shape
- [x] 8.3 Integration test: `GET /api/v1/projects/:projectId/endpoints/lookup` returns every endpoint unpaginated, 404s for another workspace
- [x] 8.4 Integration test: `GET /api/v1/projects/:projectId/events` — pagination, each filter (`eventType`, `status`, date range, `endpointId`), cross-workspace 404
- [x] 8.5 Integration test: `GET /api/v1/events/:id` — own event returned, cross-workspace 404
- [x] 8.6 Integration test: `GET /api/v1/projects/:projectId/deliveries` — pagination, each filter (`status`, `endpointId`, `httpStatusCode`, `eventId`), cross-workspace 404
- [x] 8.7 Integration test (live pipeline): after a real delivery resolves, its `httpStatusCode` and `durationMs` are non-null and correct (covered in `apps/delivery-worker`'s own integration spec)

## 9. Frontend: App Bootstrap

- [x] 9.1 Scaffold `apps/frontend` with Vite + React + TypeScript (`@relayforge/frontend`, port 5173 matching `docker-compose.yml`)
- [x] 9.2 Add dependencies: MUI, TanStack Query, React Router, Axios, React Final Form, Zod
- [x] 9.3 Scaffold the `core/`, `infrastructure/`, `presentation/` folder layout per `documentation.md` §83-90 — refined mid-implementation into the more specific per-domain pipeline (`core/types/<Domain>/{types,index}.ts` → `infrastructure/api/<Domain>/{index,types}.ts` → `infrastructure/hooks/<Domain>/use<Op>.ts` → `presentation/hooks/<Domain>/use<Domain>Feature.ts` → `presentation/containers/<Domain>/index.tsx` → `presentation/components/<Domain>/index.tsx` with child folders), with every component as one default-exported arrow function + a `Props` interface
- [x] 9.4 Wire `QueryClientProvider`, `BrowserRouter`, MUI `ThemeProvider` at the app root (`App.tsx`)

## 10. Frontend: Theme, Wrappers, Toasts

- [x] 10.1 Add the centralized MUI theme (§95) — one file, `primary.main` etc. defined once
- [x] 10.2 Build `AppButton`, `AppTextField`, `AppSelect`, `AppAutocomplete`, `AppDialog`, `AppConfirmDialog`, `AppTable`, `AppChip`, `AppSnackbar`, `AppLoader`/`AppSkeleton` — each its own `App*/index.tsx` folder
- [x] 10.3 Build `FormTextField`, `FormSelect`, `FormNumberField`, `FormCheckbox` wrappers over React Final Form + Zod, plus a shared `zodValidator` adapter (`presentation/components/Form/fns.ts`)
- [x] 10.4 Add a `ToastProvider` + `useToast` hook backed by `AppSnackbar`

## 11. Frontend: Auth

- [x] 11.1 `core/types/Auth`: token/session types
- [x] 11.2 `infrastructure/api/Auth`: pure HTTP call to `/api/v1/auth/login` (no `/refresh` call needed here — the axios interceptor calls it directly since it must run outside any component)
- [x] 11.3 `infrastructure/hooks/Auth`: `useLogin` (TanStack mutation)
- [x] 11.4 Token storage (`infrastructure/api/session.ts`) + an axios interceptor (`infrastructure/api/client.ts`) that attaches the bearer token and refreshes on 401
- [x] 11.5 Login screen (`presentation/containers/Login`) using `FormTextField` + Zod validation
- [x] 11.6 `AuthGuard` route wrapper: redirects to login if no valid session, restores session from storage on load
- [x] 11.x (added — needed for reactive session state across the tree, not just token storage) `infrastructure/useCases/Auth/{AuthProvider.tsx, useAuthUseCase.ts}`: the actual orchestration layer (login mutation + session storage + context) that `useLoginFeature`/`AuthGuard` consume

## 12. Frontend: Project Selection

- [x] 12.1 `core/types/Project`, `infrastructure/api/Project`, `infrastructure/hooks/Project/useGetProjects`
- [x] 12.2 Project switcher component + presentation hook for the currently-selected project, persisted across reload — backed by `infrastructure/useCases/Project/{ProjectProvider.tsx, useProjectUseCase.ts}` (same reactive-context shape as Auth), which also auto-selects the first project when none is chosen yet

## 13. Frontend: Events Screens

- [x] 13.1 `core/types/Event`, `core/types/Delivery`
- [x] 13.2 `infrastructure/api/Event`: `getEvents`, `getEvent`
- [x] 13.3 `infrastructure/hooks/Event`: `useGetEvents` (page/filter params), `useGetEvent`
- [x] 13.4 `presentation/hooks/Events/useEventsFeature`: pagination, filter, and navigation state
- [x] 13.5 `presentation/components/Events/{Header,Filters,Table}` + `presentation/containers/Events`
- [x] 13.6 Event detail: `presentation/containers/EventDetail` with Payload/Deliveries/Timeline sections
- [x] 13.7 `presentation/components/EventDetail/Payload`: pretty-print, copy-to-clipboard, raw-view toggle
- [x] 13.x (added — not in the original task list but required for the Deliveries section and the endpoint filter dropdown to work) `infrastructure/api/Delivery`, `infrastructure/hooks/Delivery/useGetDeliveries`, and `infrastructure/hooks/Endpoint/useGetEndpointsLookup` wired into the Events filter bar

## 14. Frontend: Endpoint Management Screens

- [x] 14.1 `core/types/Endpoint`, `infrastructure/api/Endpoint`, `infrastructure/hooks/Endpoint`: `useGetEndpoints`, `useGetEndpointsLookup`, `useCreateEndpoint`, `useUpdateEndpoint`, `useEnableEndpoint`, `useDisableEndpoint`, `useDeleteEndpoint` (plus `useGetEndpoint`, added for the endpoint detail screen)
- [x] 14.2 Endpoints list: `presentation/containers/Endpoints` + table showing name/URL/enabled/timeout
- [x] 14.3 Endpoint form (`FormTextField`/`FormNumberField` + Zod matching backend's URL/timeout validation) for create and edit
- [x] 14.4 Enable/disable toggle and delete action with `AppConfirmDialog`, each reporting via toast

## 15. Frontend: Subscription Management

- [x] 15.1 `core/types/Subscription`, `infrastructure/api/Subscription`, `infrastructure/hooks/Subscription`: `useGetSubscriptions`, `useSubscribe`, `useUnsubscribe`
- [x] 15.2 Subscriptions section on the endpoint detail view (`presentation/components/EndpointDetail`): list, subscribe form (pattern input + client-side Zod shape validation), unsubscribe action

## 16. Frontend Tests

- [x] 16.1 Unit test: payload viewer fns (pretty-print renders valid, parseable JSON; raw is single-line; copy invokes the clipboard API)
- [x] 16.2 Unit test: endpoint form Zod schema (valid input passes, invalid URL/timeout rejected, omitted timeout allowed)
- [x] 16.3 Unit test: subscription pattern client-side validation (exact, wildcard, bare `*`, malformed)
- [x] 16.4 Component test: `AuthGuard` redirects when unauthenticated, renders children when authenticated

## 17. Verification

- [x] 17.1 Run the new migration against the live `postgres` service
- [x] 17.2 Run the full backend e2e suite (updated + new specs) against live Postgres/Kafka — 10/10 suites, 72/72 tests; had to add `--runInBand` to `test:e2e` (parallel workers each booting a full Kafka-consuming app starved each other's consumer-group partitions) and raise `testTimeout` to 20000 (graceful Kafka-consumer shutdown in `afterAll` occasionally exceeded Jest's 5000ms default)
- [x] 17.3 Manually exercised the full dashboard flow with all three apps run locally (`pnpm start:dev` / `pnpm dev`) and driven with a headless-Chromium Playwright script (`chromium-cli` wasn't available in this environment): login → project switcher → create endpoint → subscribe → ingest a real event via curl → event appears in the list with correct status/delivery counts → event detail shows payload/deliveries/timeline with real `httpStatusCode`/`durationMs`. Screenshots confirm rendering; zero browser console errors. Two real bugs found and fixed only because this ran in an actual browser (curl never would have caught either): **(a)** the backend had no CORS configuration at all, so every browser-originated API call failed preflight — added `app.enableCors(...)` in `main.ts`; **(b)** `react-final-form`'s `form.reset()` left the subscribe form showing a stale "Required" error after a successful submit — switched to `form.restart()`
- [x] 17.4 Run `openspec validate basic-dashboard --strict` and fix any reported issues
