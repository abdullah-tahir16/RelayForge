## Context

See `proposal.md` for motivation and `specs/dashboard-ui-ux/spec.md` for the behavior contract. The current frontend is a small React + Vite + MUI dashboard with shared wrappers under `presentation/components/App` and `presentation/components/Form`, plus page components for login, events, event detail, endpoints, endpoint detail, and DLQ. The current MUI theme uses mostly default light styling, system fonts, simple paper surfaces, and a permanent drawer layout that is weak on product identity and narrow-screen behavior.

The redesign should stay within the existing frontend architecture: `core` for domain types, `infrastructure` for API/hooks/use cases, and `presentation` for visual components. This is a frontend design change, not a backend product change.

## Goals / Non-Goals

**Goals:**
- Establish a complete RelayForge design system inside the existing MUI theme and shared component wrappers.
- Make the dashboard feel like an infrastructure/operator product: low-glare, precise, data-dense, status-forward, and polished.
- Improve all existing screens in one coherent pass so future features do not inherit the current generic UI.
- Preserve existing frontend routes, core user flows, and API behavior.
- Improve accessibility, keyboard use, responsive behavior, and loading/error/empty state quality as part of the visual redesign.

**Non-Goals:**
- No new backend endpoints, persistence changes, or delivery/idempotency behavior.
- No new analytics dashboard, charts, search engine, WebSocket realtime layer, or audit log.
- No broad frontend architecture rewrite outside the existing `core/infrastructure/presentation` layering.
- No visual-only changes that reduce contrast, hide focus states, or make operational data harder to scan.
- No dependency-heavy design stack unless a small frontend-only dependency clearly improves maintainability.

## Decisions

**1. Use a low-glare light operations-console direction, not a generic SaaS white theme.**
RelayForge is a webhook delivery and observability tool. The visual direction should feel like a daylight control room: muted warm-gray backgrounds, ink-like text, clear status colors, and layered panels without harsh white surfaces.

Alternative considered: a dark OLED console. Rejected by product preference; the redesign should avoid eye-killing white but remain fundamentally light.

**2. Build the redesign from semantic tokens first.**
The theme should define semantic palette roles for app background, elevated surfaces, recessed panels, borders, primary text, secondary text, muted text, accent, focus, and status states. Components should consume theme roles instead of hardcoded one-off colors.

Initial direction:
- Background: warm neutral paper, not pure white and not green haze.
- Surfaces: warm off-white panels with crisp borders, controlled radius, subtle shadows, and restrained focus glow.
- Accent: delivery/run green for primary action and success, with amber/red/cyan variants for retry, failure, dead-letter, test, and informational states.
- Typography: use a clean non-default pairing: Plus Jakarta Sans for UI text and JetBrains Mono for IDs, payloads, event names, and timestamps. Avoid default system/Roboto/Inter-only styling.

Alternative considered: page-level `sx` styling. Rejected because it creates drift and makes future screens harder to align.

**3. Preserve MUI, but make the wrappers own the product feel.**
The project already uses MUI and has `App*` and `Form*` wrappers. Keep MUI as the component foundation, but centralize product-specific behavior in theme overrides and wrappers: `AppButton`, `AppTable`, `AppChip`, `AppDialog`, `AppConfirmDialog`, `AppTextField`, `AppSelect`, `AppAutocomplete`, `AppSkeleton`, `AppSnackbar`, and form wrappers.

Alternative considered: replacing MUI or adding a separate design-system library. Rejected as unnecessary churn for the current app size.

**4. Redesign the dashboard shell before page content.**
The shell should establish the product identity and orientation: brand lockup, persistent navigation, active route treatment, project context, top-level action area, and responsive navigation. Page components should then follow a shared page-header and content-card rhythm.

For narrow viewports, the permanent drawer should adapt instead of forcing desktop assumptions. The exact implementation can be a temporary drawer, compact sidebar, or top navigation, but it must keep navigation and project context reachable without horizontal overflow.

**5. Treat tables as operational scan surfaces, not plain grids.**
Tables should emphasize hierarchy: event type/endpoint/name as primary content; IDs, timestamps, and technical fields in monospaced or muted treatments; status/test/DLQ markers with consistent chips; row hover/focus states; stronger empty/loading/error states. For narrow screens, tables should either scroll within a controlled container or transform to stacked rows/cards where that preserves readability better.

Alternative considered: replacing every table with cards. Rejected because event and delivery history are inherently tabular on desktop. Cards can be used selectively on mobile.

**6. Motion should be restrained and state-driven.**
Use small transitions for route/page entrance, hover/focus/press states, skeleton-to-content reveal, and dialog appearance. Respect `prefers-reduced-motion`; do not add decorative animations that distract from operational data.

**7. Redesign page-by-page only after shared primitives are complete.**
Implementation should proceed in this order:
- Theme and global app background.
- Shell/navigation/project switcher.
- Shared components and form wrappers.
- Login.
- Events list and filters.
- Event detail, payload, deliveries, timeline, run/attempt inspector.
- Endpoints list/detail/forms/subscriptions/signing-secret.
- DLQ table and action flows.

This order prevents each page from inventing its own local visual language.

**8. Tests should validate behavior and key accessible labels, not snapshots.**
Existing frontend tests should be updated to match changed labels/hierarchy where needed, but avoid fragile visual snapshots. Add focused tests for important interactions: navigation remains reachable, primary actions still fire, disabled/loading states work, tables preserve row clicks/actions, and test/status markers remain visible.

## Risks / Trade-offs

- **[Large frontend surface area]** -> Mitigation: implement shared theme/wrappers first, then migrate screens in a controlled order with tests after each group.
- **[Low-glare light UI can become washed out if surfaces are too similar]** -> Mitigation: define contrast-safe tokens, verify status chips and text on every surface, and keep muted text readable.
- **[Responsive redesign can break desktop data density or mobile usability]** -> Mitigation: explicitly test 375px, tablet, and desktop layouts; use mobile-specific table/card adaptations only where needed.
- **[Over-styling can obscure operational data]** -> Mitigation: prioritize hierarchy, contrast, and scannability over decorative effects.
- **[Font loading can cause layout shifts or slow first render]** -> Mitigation: use `font-display: swap`, limit weights, and keep mono font usage focused on technical text.

## Migration Plan

1. Implement design tokens and global theme overrides while preserving existing routes.
2. Upgrade shared wrappers and ensure current screens still compile.
3. Migrate shell and pages in dependency order from shared layout to feature screens.
4. Update frontend tests alongside each migrated area.
5. Run frontend build/tests and manually smoke-test core flows through the local app.

Rollback is straightforward because this change should not modify backend behavior or persisted data: revert the frontend theme/component/page changes and any frontend-only dependencies.
