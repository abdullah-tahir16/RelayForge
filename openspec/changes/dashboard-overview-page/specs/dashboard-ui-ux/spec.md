## MODIFIED Requirements

### Requirement: Dashboard shell provides strong navigation and orientation
The dashboard SHALL provide persistent navigation and project context that helps users understand where they are, which project is active, and what actions are available without reducing data-table readability. Primary navigation SHALL show an icon and a full visible text label for each destination at every viewport width; narrow viewports SHALL present this navigation as a dismissible drawer rather than a permanent rail.

#### Scenario: User opens a top-level dashboard route
- **WHEN** a user opens Overview, Events, Endpoints, or Dead Letter Queue
- **THEN** the active navigation item, current project context, page title, supporting description, and primary screen actions are visually clear

#### Scenario: User opens a detail route
- **WHEN** a user opens Event Detail or Endpoint Detail directly from a URL
- **THEN** the dashboard preserves navigation access and provides enough local context for the user to understand the selected event or endpoint

#### Scenario: User navigates with the keyboard
- **WHEN** a keyboard user tabs through the dashboard shell and page controls
- **THEN** focus order follows the visual order and all active controls expose visible focus indication

#### Scenario: User identifies a navigation destination
- **WHEN** a user views primary navigation at any viewport width
- **THEN** each navigation item shows both an icon and a visible text label, not an icon alone

#### Scenario: Narrow-viewport user opens navigation
- **WHEN** a user on a narrow viewport opens the navigation drawer
- **THEN** each navigation item is shown with a full visible text label alongside its icon
