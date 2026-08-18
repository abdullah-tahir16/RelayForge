## Purpose

Gives RelayForge its first real UI shell: a way to log in, pick which project you're looking at, and get consistent feedback when an action succeeds or fails — the foundation every dashboard screen is built on.

## ADDED Requirements

### Requirement: Authenticate through a login screen
The system SHALL present a login form that authenticates against the existing `/api/v1/auth/login` API, store the returned tokens, and redirect to the dashboard on success.

#### Scenario: Successful login
- **WHEN** a user submits valid credentials on the login screen
- **THEN** the system stores the returned access and refresh tokens and navigates to the dashboard

#### Scenario: Invalid credentials
- **WHEN** a user submits invalid credentials on the login screen
- **THEN** the system displays an error and does not navigate away from the login screen

### Requirement: Dashboard routes require authentication
The system SHALL redirect an unauthenticated visitor attempting to reach any dashboard route to the login screen, and SHALL restore a valid session from stored tokens on page reload without requiring the user to log in again.

#### Scenario: Unauthenticated access redirected
- **WHEN** a visitor with no valid session navigates directly to a dashboard route
- **THEN** the system redirects them to the login screen

#### Scenario: Session restored on reload
- **WHEN** a user with a valid stored session reloads the page
- **THEN** the system restores the session without showing the login screen

### Requirement: Select a project to scope the dashboard to
The system SHALL let a user with more than one project switch which project's data every dashboard screen displays.

#### Scenario: Switching project changes scope
- **WHEN** a user with multiple projects selects a different project from the switcher
- **THEN** every dashboard screen's data refreshes to that project's scope

### Requirement: Mutations report success or failure via toast
The system SHALL display a toast notification confirming success or reporting failure for every mutating action (login, endpoint create/update/enable/disable/delete, subscribe/unsubscribe).

#### Scenario: Successful mutation shows a success toast
- **WHEN** a mutating action completes successfully
- **THEN** the system displays a success toast describing what happened

#### Scenario: Failed mutation shows an error toast
- **WHEN** a mutating action fails
- **THEN** the system displays an error toast describing the failure, without silently swallowing it
