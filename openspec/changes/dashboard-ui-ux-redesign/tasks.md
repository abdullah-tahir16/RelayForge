## 1. Design Tokens And Theme Foundation

- [x] 1.1 Audit current frontend theme, global styles, shared wrappers, and page surfaces for default MUI styling and accessibility gaps.
- [x] 1.2 Define RelayForge semantic design tokens for backgrounds, elevated/recessed surfaces, borders, text, accent, focus, status states, shadows, radius, spacing, and motion.
- [x] 1.3 Add the chosen technical typography system, limiting font weights and applying mono styling only to operational identifiers, payloads, timestamps, and code-like values.
- [x] 1.4 Replace the current MUI theme with low-glare light operations-console palette values, component defaults, typography scale, focus styles, and global body background.
- [x] 1.5 Add reduced-motion-safe transition helpers or theme-level motion conventions for hover, focus, dialog, skeleton, and page/content reveal states.

## 2. Shared Component System

- [x] 2.1 Redesign `AppButton` variants and loading/disabled behavior so primary, secondary, danger, and subtle actions are visually distinct and accessible.
- [x] 2.2 Redesign `AppChip` status treatments for events, deliveries, runs, attempts, endpoints, test traffic, replay, warning, failure, and dead-letter states without relying on color alone.
- [x] 2.3 Redesign `AppTable` for operational scanning: stronger header hierarchy, row hover/focus states, empty state support, pagination styling, responsive containment, and mobile-safe behavior.
- [x] 2.4 Redesign `AppDialog` and `AppConfirmDialog` with stronger scrim, clear destructive-action hierarchy, accessible labels, and stable pending states.
- [x] 2.5 Redesign `AppTextField`, `AppSelect`, `AppAutocomplete`, and `Form*` wrappers with visible labels, helper/error spacing, focus states, and low-glare surface contrast.
- [x] 2.6 Redesign `AppSkeleton`, `AppLoader`, and snackbar/toast presentation so loading and feedback states fit the new visual system without layout jumps.
- [x] 2.7 Add any small shared layout primitives needed for page headers, surface cards, metadata rows, code/value blocks, or responsive action groups.

## 3. Dashboard Shell And Navigation

- [x] 3.1 Redesign `DashboardLayout` with a distinctive RelayForge brand area, persistent navigation, active route styling, project context, page container rhythm, and high-contrast shell surfaces.
- [x] 3.2 Improve narrow-viewport navigation so routes, project switching, and primary page actions remain reachable without horizontal overflow.
- [x] 3.3 Redesign `ProjectSwitcher` to match the shell, handle loading/empty/error states clearly, and preserve current project selection behavior.
- [x] 3.4 Ensure route-level layout preserves keyboard focus visibility and does not trap or hide navigation on detail pages.

## 4. Auth And Entry Experience

- [x] 4.1 Redesign the login screen into a branded RelayForge entry surface with clear product context, accessible form hierarchy, and consistent low-glare light-theme styling.
- [x] 4.2 Preserve login validation, pending state, auth failure feedback, token handling, and route guard behavior after visual changes.
- [x] 4.3 Update auth-related tests for the new visible labels, button states, and route guard expectations.

## 5. Events Experience

- [x] 5.1 Redesign the Events page header, filter layout, endpoint picker, date/status controls, and reset/change behavior for the new page rhythm.
- [x] 5.2 Redesign the Events table so event type, status, delivery count, test marker, endpoint context, and timestamps are easier to scan.
- [x] 5.3 Redesign Event Detail header and summary metadata so event identity, status, test traffic, created/published timing, and linked delivery context are clear.
- [x] 5.4 Redesign the payload viewer with readable code styling, copy/raw/prettified affordances, overflow behavior, and accessible control labels.
- [x] 5.5 Redesign Event Detail deliveries and timeline sections using consistent cards/tables, status chips, loading states, and empty states.
- [x] 5.6 Preserve existing event navigation, polling behavior, delivery selection by query parameter, and row click behavior.

## 6. Endpoint Management Experience

- [x] 6.1 Redesign the Endpoints page header, create action, table hierarchy, enabled/disabled state, edit/delete actions, and empty state.
- [x] 6.2 Redesign endpoint create/edit forms with clearer URL, timeout, description, enabled, validation, submit, and cancel behavior.
- [x] 6.3 Redesign Endpoint Detail configuration, action grouping, endpoint test delivery action, enable/disable presentation, and metadata hierarchy.
- [x] 6.4 Redesign subscriptions table and subscription form so event-pattern input, subscribe/unsubscribe actions, and empty states are clear.
- [x] 6.5 Redesign signing-secret rotation and one-time secret disclosure flows with strong warning hierarchy and accessible confirmation behavior.
- [x] 6.6 Preserve endpoint CRUD, enable/disable, delete, test delivery, subscribe/unsubscribe, and signing-secret rotation behavior after visual changes.

## 7. Delivery, Attempt, And DLQ Experience

- [x] 7.1 Redesign `DeliveryRunInspector` so runs and attempts are visually grouped by lifecycle, run number, trigger, attempt count, HTTP status, timing, and error state.
- [x] 7.2 Redesign delivery attempts and run-history sections used from Event Detail and DLQ without duplicating divergent styles.
- [x] 7.3 Redesign the Dead Letter Queue page header, table, inspect action, replay action, disable-endpoint action, selected-run state, and explanatory copy.
- [x] 7.4 Preserve replay, disable endpoint, inspect selected delivery, DLQ pagination, and error/loading behavior after visual changes.

## 8. Responsive, Accessibility, And Visual QA

- [x] 8.1 Verify the redesigned dashboard at approximately 375px, 768px, 1024px, and desktop widths with no page-level horizontal overflow.
- [x] 8.2 Verify keyboard navigation, focus visibility, dialog escape/cancel paths, disabled semantics, and touch target sizing for primary flows.
- [x] 8.3 Verify contrast for text, icons, borders, focus rings, status chips, tables, and dialogs on the chosen low-glare light surfaces.
- [x] 8.4 Verify reduced-motion behavior keeps state changes understandable while disabling or reducing decorative motion.
- [x] 8.5 Smoke-test core flows locally: login, project switch, events list/detail, endpoint CRUD, endpoint test delivery, subscription management, signing-secret rotation, DLQ inspect/replay/disable.

## 9. Tests, Documentation, And Roadmap

- [x] 9.1 Update existing frontend tests affected by redesigned labels, hierarchy, and component structure without adding brittle visual snapshots.
- [x] 9.2 Add focused frontend tests for redesigned shell/navigation reachability, shared component behavior, test/status markers, form pending/error states, and key action callbacks.
- [x] 9.3 Run `pnpm --dir apps/frontend build` and `pnpm --dir apps/frontend test`.
- [x] 9.4 Update `LLM_CONTEXT.md` with the dashboard visual-system direction and frontend design conventions.
- [x] 9.5 Move the roadmap entry through Proposed/Doing/Done according to OpenSpec progress while keeping `idempotency-keys` as the next backend correctness change.

## 10. Visual Quality Correction

- [x] 10.1 Replace the heavy text sidebar with a modern compact navigation rail that keeps routes accessible while giving the main dashboard more premium composition.
- [x] 10.2 Replace the current UI font direction with a cleaner premium SaaS font and keep monospace usage limited to technical identifiers, timestamps, URLs, and payloads.
- [x] 10.3 Rework the dashboard shell so top context controls cannot overlap or hide page-level primary actions at any viewport width.
- [x] 10.4 Rebalance the app canvas, page headers, surfaces, cards, filters, and tables toward the provided reference style: soft neutral canvas, white floating modules, strong black type, restrained accent color, and controlled rounded corners.
- [x] 10.5 Add compact overview/stat modules where useful so list pages do not feel like empty canvas with one table.
- [x] 10.6 Verify build, tests, OpenSpec validation, and local frontend serve after the corrective visual pass.

## 11. Simplification Correction (round 3, direct user feedback)

Round 2 (section 10) still wasn't right: after running the app and looking at real screenshots, the user rejected the icon-only rail, the floating rounded/shadowed shell, the Manrope typeface, and the gradient/glow decoration outright, asking for "simple page." (The nav-shape side of this lives in `dashboard-overview-page/tasks.md` section 8, since that change is what actually built the icon-only rail; this section covers the shared theme.)

- [x] 11.1 Flattened the theme: removed the two-layer body background gradient, the primary-button gradient, the dialog background gradient, and the sidebar logo's gradient+glow badge in favor of flat solid colors.
- [x] 11.2 Reduced border-radius across shared tokens/components: `shape.borderRadius` 10→8, buttons/inputs 10-12→8, `AppSurface`/`AppDialog`/`AppConfirmDialog`/`AppMetricStrip` 24px→8px.
- [x] 11.3 Removed the `boxShadow` "glow"/elevation treatment from `AppSurface`, `AppMetricStrip`, and the dashboard shell's floating content card.
- [x] 11.4 Replaced Manrope with the system font stack for UI text (`theme/fonts.css` no longer imports it); kept JetBrains Mono for technical/monospace text.
- [x] 11.5 Removed the shell's `overflow:hidden` + fixed-viewport-height clipping (was reported as "unnecessary scrolls"); the page now scrolls as one natural document, with the sidebar/header pinned via `position:sticky` instead of a separately-scrolling inner region.
- [x] 11.6 Ran `pnpm --dir apps/frontend build` and `pnpm --dir apps/frontend test` (51/51) after the pass, and re-verified visually via live screenshots of the running app rather than relying on component tests alone.
