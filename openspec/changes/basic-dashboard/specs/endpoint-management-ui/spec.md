## Purpose

Gives the `endpoints` and `subscriptions` capabilities their first UI, so a developer can register a webhook destination and subscribe it to events without ever calling the API directly.

## ADDED Requirements

### Requirement: Endpoint list screen
The system SHALL display the current project's endpoints as a paginated table showing name, URL, enabled/disabled state, and timeout. Success-rate and last-delivery statistics are explicitly out of scope — they belong to a later analytics capability that doesn't exist yet.

#### Scenario: Endpoints render with their configuration
- **WHEN** a user views the endpoints list for a project with endpoints
- **THEN** each row shows the endpoint's name, URL, enabled/disabled state, and timeout

### Requirement: Create and edit an endpoint through a form
The system SHALL provide a form to register a new endpoint and to edit an existing one, validating name, URL, and timeout range client-side before submission, matching the same rules the backend already enforces.

#### Scenario: Valid submission creates an endpoint
- **WHEN** a user submits the endpoint form with a valid name and URL
- **THEN** the system creates the endpoint and shows a success toast

#### Scenario: Invalid URL is rejected before submission
- **WHEN** a user submits the endpoint form with a URL the client-side validation rejects
- **THEN** the system shows a validation error next to the field and does not submit the request

#### Scenario: Backend rejection surfaces as an error, not a silent failure
- **WHEN** a user submits the endpoint form and the backend rejects it (e.g. a blocklisted hostname the client-side check didn't catch)
- **THEN** the system shows an error toast describing the rejection

### Requirement: Enable, disable, and delete an endpoint
The system SHALL let a user enable, disable, or delete an endpoint from the endpoint list or detail view, confirming the delete action before performing it.

#### Scenario: Toggle enabled state
- **WHEN** a user disables an enabled endpoint
- **THEN** the system disables it and shows a success toast

#### Scenario: Delete requires confirmation
- **WHEN** a user clicks delete on an endpoint
- **THEN** the system shows a confirmation dialog before deleting, and does not delete if the user cancels

### Requirement: Manage an endpoint's subscriptions
The system SHALL let a user, from an endpoint's detail view, subscribe it to an event pattern, list its current subscriptions, and unsubscribe — validating the pattern client-side against the same shape the backend enforces (exact type or wildcard) before submission.

#### Scenario: Subscribe to a valid pattern
- **WHEN** a user submits a well-formed event pattern on an endpoint's detail view
- **THEN** the system creates the subscription and shows it in the endpoint's subscription list

#### Scenario: Malformed pattern rejected before submission
- **WHEN** a user submits a pattern the client-side validation rejects
- **THEN** the system shows a validation error and does not submit the request

#### Scenario: Unsubscribe
- **WHEN** a user removes a subscription from an endpoint's detail view
- **THEN** the system deletes it and shows a success toast
