## ADDED Requirements

### Requirement: API key listing is paginated
Listing API keys for a project (`GET /api/v1/projects/:projectId/api-keys`) SHALL return a paginated envelope (`items`, `total`, `page`, `pageSize`) instead of a bare array, accepting `page` and `pageSize` query parameters. Listed keys SHALL continue to show only prefix, name, creation date, last-used date, and revocation status — never the full key value or its hash.

#### Scenario: List own project's keys, paginated
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/api-keys?page=1&pageSize=25` for a project in their own workspace
- **THEN** the system returns a paginated envelope containing at most 25 keys and the total count for that project, each masked as before

#### Scenario: Default pagination applied when not specified
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/api-keys` without `page`/`pageSize`
- **THEN** the system applies default pagination values and returns the same envelope shape
