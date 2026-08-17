## Purpose

Lets a user organize their webhook configuration into isolated projects (e.g. "E-Commerce", "Billing"), each scoped to their own workspace, so unrelated integrations don't share endpoints, subscriptions, or events.

## ADDED Requirements

### Requirement: Create a project in the caller's workspace
The system SHALL allow an authenticated user to create a project with a name and an optional description. The project SHALL be created in the caller's own workspace, and the system SHALL assign it an immutable, workspace-unique display key derived from its name.

#### Scenario: Successful creation
- **WHEN** an authenticated user submits `POST /api/v1/projects` with a name
- **THEN** the system creates a project owned by the caller's workspace and returns it, including its generated key

#### Scenario: Missing name
- **WHEN** an authenticated user submits `POST /api/v1/projects` without a name
- **THEN** the system rejects the request without creating a project

### Requirement: List projects in the caller's workspace
The system SHALL allow an authenticated user to list only the projects belonging to their own workspace.

#### Scenario: List own projects
- **WHEN** an authenticated user submits `GET /api/v1/projects`
- **THEN** the system returns every project in the caller's workspace and no project belonging to any other workspace

### Requirement: Fetch a single project by id
The system SHALL allow an authenticated user to fetch a project by id only if it belongs to their own workspace.

#### Scenario: Fetch own project
- **WHEN** an authenticated user submits `GET /api/v1/projects/:id` for a project in their own workspace
- **THEN** the system returns that project

#### Scenario: Fetch another workspace's project
- **WHEN** an authenticated user submits `GET /api/v1/projects/:id` for a project belonging to a different workspace
- **THEN** the system rejects the request as if the project does not exist

### Requirement: Update a project's name or description
The system SHALL allow an authenticated user to update the name and/or description of a project in their own workspace. The project's key SHALL NOT change as a result of an update.

#### Scenario: Successful update
- **WHEN** an authenticated user submits `PATCH /api/v1/projects/:id` with a new name for a project in their own workspace
- **THEN** the system updates the project's name and leaves its key unchanged

#### Scenario: Update another workspace's project
- **WHEN** an authenticated user submits `PATCH /api/v1/projects/:id` for a project belonging to a different workspace
- **THEN** the system rejects the request as if the project does not exist

### Requirement: Delete a project
The system SHALL allow an authenticated user to delete a project in their own workspace. Deleting a project SHALL also delete every API key that had been issued for it.

#### Scenario: Successful deletion
- **WHEN** an authenticated user submits `DELETE /api/v1/projects/:id` for a project in their own workspace
- **THEN** the system deletes the project and every API key that had been issued for it

#### Scenario: Delete another workspace's project
- **WHEN** an authenticated user submits `DELETE /api/v1/projects/:id` for a project belonging to a different workspace
- **THEN** the system rejects the request as if the project does not exist
