## Purpose

Lets a developer see, at a glance and in detail, what happened to every event their project has published — without ever needing to query the database or replay a curl command.

## ADDED Requirements

### Requirement: Events list screen
The system SHALL display the current project's events as a paginated table showing event type, created-at, status, and delivery success/total count, and SHALL let the user filter by event type, status, created-date range, and endpoint.

#### Scenario: Events render with status and delivery counts
- **WHEN** a user views the events list for a project with events
- **THEN** each row shows the event's type, created-at, status, and how many of its deliveries succeeded out of the total

#### Scenario: Filtering narrows the list
- **WHEN** a user applies a status filter
- **THEN** the table shows only events at that status, and the applied filter is visibly indicated

#### Scenario: Paging through results
- **WHEN** an events list has more results than fit on one page
- **THEN** the user can navigate to subsequent pages without losing the applied filters

### Requirement: Event detail screen
The system SHALL display, for a single event, its payload, metadata, list of deliveries with their status, and a timeline synthesized from the event's and its deliveries' own timestamps (created, published, and each delivery's completed/failed time) — not a separate audit log, which does not exist yet.

#### Scenario: Event detail shows payload and deliveries
- **WHEN** a user opens an event's detail view
- **THEN** the system displays its payload, metadata, and every Delivery record created for it with each one's status

#### Scenario: Timeline reflects available timestamps only
- **WHEN** a user views an event's timeline
- **THEN** the system shows the event's created and published times plus each delivery's completion or failure time, in chronological order

### Requirement: JSON payload viewer
The system SHALL render an event's payload pretty-printed by default, let the user copy it to the clipboard, and let the user toggle to a raw (unformatted) view.

#### Scenario: Pretty-printed by default
- **WHEN** a user opens an event's payload viewer
- **THEN** the JSON is displayed pretty-printed and readable

#### Scenario: Copy payload
- **WHEN** a user clicks the copy action on the payload viewer
- **THEN** the full payload JSON is copied to the clipboard

#### Scenario: Toggle raw view
- **WHEN** a user toggles the payload viewer to raw view
- **THEN** the system displays the unformatted JSON string
