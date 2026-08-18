## ADDED Requirements

### Requirement: Endpoint listing is paginated
Listing endpoints for a project (`GET /api/v1/projects/:projectId/endpoints`) SHALL return a paginated envelope (`items`, `total`, `page`, `pageSize`) instead of a bare array, accepting `page` and `pageSize` query parameters.

#### Scenario: List own endpoints, paginated
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/endpoints?page=1&pageSize=25` for a project in their own workspace
- **THEN** the system returns a paginated envelope containing at most 25 endpoints and the total count for that project

#### Scenario: Default pagination applied when not specified
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/endpoints` without `page`/`pageSize`
- **THEN** the system applies default pagination values and returns the same envelope shape

### Requirement: Unpaginated endpoint lookup for pickers and filters
The system SHALL allow an authenticated user to fetch every endpoint's id and name for a project in their own workspace via `GET /api/v1/projects/:projectId/endpoints/lookup`, unpaginated and unfiltered, for populating filter dropdowns and pickers.

#### Scenario: Lookup returns every endpoint, not just one page
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/endpoints/lookup` for a project with more endpoints than one page of the paginated list endpoint
- **THEN** the system returns every endpoint's id and name for that project, with no pagination envelope

#### Scenario: Lookup for another workspace's project
- **WHEN** an authenticated user submits `GET /api/v1/projects/:projectId/endpoints/lookup` for a project belonging to a different workspace
- **THEN** the system rejects the request as if the project does not exist
