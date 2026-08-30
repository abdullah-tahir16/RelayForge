## Purpose

Gives users a single project-scoped landing page that shows delivery health at a glance instead of requiring them to open Events, Endpoints, or the Dead Letter Queue individually to understand system state.

## ADDED Requirements

### Requirement: Overview page shows project-scoped delivery health
The system SHALL display, for the currently selected project, counts of in-flight events, events needing attention (failed or partially failed), dead-letter queue backlog depth, and endpoint enabled/disabled counts.

#### Scenario: User opens Overview
- **WHEN** a user navigates to the Overview page
- **THEN** the page displays current in-flight, needs-attention, DLQ backlog, and endpoint enabled/disabled counts for the active project

#### Scenario: User switches project
- **WHEN** a user switches the active project while viewing Overview
- **THEN** the displayed counts refresh to reflect the newly selected project

### Requirement: Overview page shows recent delivery activity
The system SHALL display a list of the most recent events or delivery attempts for the active project, each linking through to its detail view.

#### Scenario: User views recent activity
- **WHEN** a user opens Overview and recent activity exists for the active project
- **THEN** the page lists the most recent items with enough context (identifier, status, timestamp) to distinguish them, and selecting one navigates to its detail view

### Requirement: Overview page handles loading, empty, and error states
The system SHALL show a stable loading state while summary data loads, an intentional empty state when a project has no relevant data yet, and a clear failure state if the summary data cannot be loaded.

#### Scenario: Summary data is loading
- **WHEN** Overview is opened and summary data has not yet returned
- **THEN** the page shows a loading state that preserves layout shape

#### Scenario: Project has no data yet
- **WHEN** the active project has no events, endpoints, or dead-lettered deliveries
- **THEN** the page shows an empty state explaining there is no activity yet

#### Scenario: Summary data fails to load
- **WHEN** the summary request fails
- **THEN** the page shows a clear failure state with enough context for the user to retry

### Requirement: Overview is the default primary navigation destination
The system SHALL include Overview as the first item in primary dashboard navigation, alongside Events, Dead Letter Queue, and Endpoints.

#### Scenario: User views primary navigation
- **WHEN** a user views the dashboard's primary navigation
- **THEN** Overview appears as a navigation destination ahead of Events, Dead Letter Queue, and Endpoints
