## ADDED Requirements

### Requirement: Project listing is paginated
Listing a caller's projects (`GET /api/v1/projects`) SHALL return a paginated envelope (`items`, `total`, `page`, `pageSize`) instead of a bare array, accepting `page` and `pageSize` query parameters.

#### Scenario: List own projects, paginated
- **WHEN** an authenticated user submits `GET /api/v1/projects?page=1&pageSize=25`
- **THEN** the system returns a paginated envelope containing at most 25 of their workspace's projects and the total count

#### Scenario: Default pagination applied when not specified
- **WHEN** an authenticated user submits `GET /api/v1/projects` without `page`/`pageSize`
- **THEN** the system applies default pagination values and returns the same envelope shape
