## Purpose

Defines the visual, interaction, accessibility, and responsive behavior expected from the RelayForge dashboard so operational delivery data is clear, polished, and usable across existing screens.

## ADDED Requirements

### Requirement: Dashboard uses a cohesive RelayForge visual system
The dashboard SHALL present a consistent, non-default visual identity across authenticated and unauthenticated screens, including semantic color usage, typography hierarchy, surface depth, spacing rhythm, status styling, and focus states.

#### Scenario: User moves between dashboard screens
- **WHEN** a user navigates between Events, Event Detail, Endpoints, Endpoint Detail, and Dead Letter Queue screens
- **THEN** the screens share the same visual language for page titles, surfaces, tables, action groups, status markers, spacing, and interactive states

#### Scenario: User signs in
- **WHEN** a user views the login screen
- **THEN** it uses the same RelayForge brand direction as the authenticated dashboard rather than appearing as a separate default-styled form

#### Scenario: Status appears in multiple places
- **WHEN** event, delivery, run, attempt, endpoint, test, success, warning, failure, or dead-letter states are shown
- **THEN** their visual treatment is consistent, readable, and not dependent on color alone

### Requirement: Dashboard shell provides strong navigation and orientation
The dashboard SHALL provide persistent navigation and project context that helps users understand where they are, which project is active, and what actions are available without reducing data-table readability.

#### Scenario: User opens a top-level dashboard route
- **WHEN** a user opens Events, Endpoints, or Dead Letter Queue
- **THEN** the active navigation item, current project context, page title, supporting description, and primary screen actions are visually clear

#### Scenario: User opens a detail route
- **WHEN** a user opens Event Detail or Endpoint Detail directly from a URL
- **THEN** the dashboard preserves navigation access and provides enough local context for the user to understand the selected event or endpoint

#### Scenario: User navigates with the keyboard
- **WHEN** a keyboard user tabs through the dashboard shell and page controls
- **THEN** focus order follows the visual order and all active controls expose visible focus indication

### Requirement: Data-heavy views are scannable and actionable
The dashboard SHALL make event, delivery, endpoint, subscription, attempt, run, and dead-letter data easier to scan by improving hierarchy, density, table behavior, empty states, and row/action affordances.

#### Scenario: User scans an events or deliveries table
- **WHEN** a user views a populated operational table
- **THEN** primary identifiers, status, timestamps, endpoint context, and available row actions are visually distinct without requiring the user to parse every column equally

#### Scenario: User views an empty data set
- **WHEN** a table or detail section has no rows to show
- **THEN** the dashboard shows an intentional empty state that explains what is missing and, when appropriate, what action creates data

#### Scenario: User waits for async data
- **WHEN** a dashboard view is loading data
- **THEN** the dashboard shows a stable loading state that preserves layout shape and avoids large content jumps

#### Scenario: User sees a failed load or mutation
- **WHEN** a query or mutation fails
- **THEN** the dashboard shows clear failure feedback with enough context for the user to retry, change input, or understand that no local data was changed

### Requirement: Forms and destructive flows are clear and recoverable
The dashboard SHALL make endpoint, subscription, auth, signing-secret, replay, disable, delete, and test-delivery flows understandable before submission and clear after success or failure.

#### Scenario: User fills a form
- **WHEN** a user edits login credentials, endpoint fields, subscription patterns, or related form inputs
- **THEN** each field has a visible label, accessible error presentation, readable helper text when needed, and submit feedback while the operation is pending

#### Scenario: User starts a risky action
- **WHEN** a user initiates endpoint deletion, endpoint disablement, signing-secret rotation, delivery replay, or another potentially destructive operation
- **THEN** the confirmation flow clearly distinguishes the action from normal navigation and explains the effect before confirmation

#### Scenario: User completes a mutation
- **WHEN** a create, update, delete, replay, rotate, subscribe, unsubscribe, enable, disable, login, or endpoint-test action succeeds or fails
- **THEN** the dashboard provides timely feedback without hiding the resulting state change or required next step

### Requirement: Dashboard remains usable on narrow screens
The dashboard SHALL support mobile and narrow viewport usage without horizontal page overflow, hidden primary actions, inaccessible navigation, or cramped touch targets.

#### Scenario: User opens the dashboard at phone width
- **WHEN** the viewport is approximately 375px wide
- **THEN** primary navigation, project context, page title, filters, tables, forms, dialogs, and primary actions remain reachable without horizontal page scrolling

#### Scenario: User opens a data table on a narrow screen
- **WHEN** a table cannot fit all columns comfortably
- **THEN** the dashboard adapts the presentation so the most important fields and actions remain understandable and operable

#### Scenario: User taps interactive controls
- **WHEN** a user interacts with navigation items, buttons, row actions, form controls, dialogs, or pagination on a touch device
- **THEN** controls provide clear hit areas, disabled states, and feedback appropriate for touch input

### Requirement: Dashboard respects accessibility and motion preferences
The dashboard SHALL preserve or improve accessibility while changing visuals, including contrast, semantic structure, keyboard operation, screen-reader-friendly labels, and reduced-motion behavior.

#### Scenario: User has reduced motion enabled
- **WHEN** the user agent reports a reduced-motion preference
- **THEN** decorative or nonessential motion is reduced or disabled while state changes remain understandable

#### Scenario: User depends on readable contrast
- **WHEN** text, icons, borders, focus rings, chips, status markers, or table content appear on dashboard surfaces
- **THEN** contrast is sufficient for readability and state recognition in the chosen visual theme

#### Scenario: User uses assistive technology
- **WHEN** a screen reader or keyboard-only user operates the dashboard
- **THEN** important navigation, form, dialog, table, status, and toast feedback remains discoverable through semantic labels, roles, focus behavior, or live-region behavior as appropriate
