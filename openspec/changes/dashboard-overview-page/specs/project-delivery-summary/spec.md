## Purpose

Provides a single aggregate endpoint that computes project-scoped delivery health counts so callers don't need to page through every list endpoint to compute totals themselves.

## ADDED Requirements

### Requirement: Summary endpoint returns aggregate delivery health counts
The system SHALL expose a project-scoped endpoint that returns, in a single response, the count of in-flight events, the count of events needing attention (failed or partially failed), the dead-letter queue backlog depth, and endpoint enabled/disabled counts, all computed from the requesting project's data only.

#### Scenario: Authorized request for a project with data
- **WHEN** a caller with access to a project requests its summary
- **THEN** the response includes in-flight count, needs-attention count, DLQ backlog depth, and endpoint enabled/disabled counts computed only from that project's data

#### Scenario: Project has no data
- **WHEN** a caller requests the summary for a project with no events or endpoints
- **THEN** the response returns zero counts rather than an error

### Requirement: Summary endpoint enforces project ownership
The system SHALL verify that the requesting user's workspace owns the requested project before computing or returning any summary data, consistent with every other project-scoped endpoint.

#### Scenario: Request for a project outside the caller's workspace
- **WHEN** a caller requests a summary for a project that does not belong to their workspace
- **THEN** the system rejects the request and returns no summary data

### Requirement: Summary endpoint reflects recent activity
The system SHALL include, in the summary response, a bounded list of the most recent events or delivery attempts for the requested project, ordered most-recent-first.

#### Scenario: Caller requests summary with recent activity present
- **WHEN** a caller requests a project's summary and recent events or attempts exist
- **THEN** the response includes the most recent items ordered most-recent-first, up to a bounded limit
