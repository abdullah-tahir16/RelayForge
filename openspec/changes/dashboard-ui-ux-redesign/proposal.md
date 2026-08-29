## Why

RelayForge's dashboard now exposes the core delivery lifecycle, but its visual system is still close to default Material UI: generic typography, flat light surfaces, plain navigation, and low product identity. This change upgrades the dashboard into a polished operator console before adding more complex Phase 3 correctness features on top of weak UI foundations.

## What Changes

- Establish a distinctive RelayForge dashboard direction: a low-glare light infrastructure operations console with warm neutral surfaces, crisp borders, clear webhook/delivery status language, technical typography, and restrained motion.
- Replace default-feeling frontend theming with semantic design tokens for background, surfaces, borders, text, focus, status, shadows, density, typography, and component states.
- Redesign the authenticated dashboard shell: sidebar, header, project switcher placement, page container rhythm, active navigation, responsive behavior, and route-level focus/accessibility expectations.
- Upgrade shared UI primitives used across the app: buttons, tables, chips, dialogs, inputs, selects/autocomplete, skeleton/loading states, toast/snackbar feedback, and confirmation flows.
- Refresh every existing dashboard screen using the new system: login, events list, event detail, endpoints list, endpoint detail, subscriptions, delivery run inspector, and dead-letter queue.
- Improve UX quality for data-heavy views: scannable table hierarchy, stronger empty/error/loading states, visible test/status markers, mobile-safe layouts, keyboard navigation, and reduced-motion behavior.
- Keep backend APIs and data contracts unchanged except where frontend tests or fixtures need updated expectations for presentation.

## Capabilities

### New Capabilities
- `dashboard-ui-ux`: visual system, dashboard shell, shared component quality, responsive behavior, accessibility, and page-level UX standards for the RelayForge frontend.

### Modified Capabilities
(none)

## Impact

- Frontend: broad changes across `apps/frontend/src/theme`, shared `App*`/`Form*` components, dashboard layout, and all presentation components/containers.
- Tests: frontend component and hook tests will need updates for redesigned labels, states, hierarchy, and interaction behavior.
- Dependencies: may add frontend-only packages for typography, icons, or small visual helpers if the design requires them; avoid heavy charting or animation libraries unless justified.
- Product scope: no new backend feature, API endpoint, authentication behavior, delivery semantics, or idempotency behavior is introduced by this change.
