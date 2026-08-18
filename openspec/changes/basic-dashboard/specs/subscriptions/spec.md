## ADDED Requirements

### Requirement: Subscription listing is paginated
Listing subscriptions for an endpoint (`GET /api/v1/endpoints/:id/subscriptions`) SHALL return a paginated envelope (`items`, `total`, `page`, `pageSize`) instead of a bare array, accepting `page` and `pageSize` query parameters.

#### Scenario: List own endpoint's subscriptions, paginated
- **WHEN** an authenticated user submits `GET /api/v1/endpoints/:id/subscriptions?page=1&pageSize=25` for an endpoint in their own workspace
- **THEN** the system returns a paginated envelope containing at most 25 subscriptions and the total count for that endpoint

#### Scenario: Default pagination applied when not specified
- **WHEN** an authenticated user submits `GET /api/v1/endpoints/:id/subscriptions` without `page`/`pageSize`
- **THEN** the system applies default pagination values and returns the same envelope shape
