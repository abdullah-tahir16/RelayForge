## Purpose

Gives every person using RelayForge an identity and a workspace to scope their projects, keys, and events under, and a session mechanism the rest of the product can trust.

## ADDED Requirements

### Requirement: User registration creates a user and a workspace
The system SHALL allow a new user to register with an email and password, and SHALL create exactly one workspace owned by that user as part of registration.

#### Scenario: Successful registration
- **WHEN** a client submits `POST /api/v1/auth/register` with a valid, not-yet-registered email and a password
- **THEN** the system creates a new user, creates a new workspace owned by that user, and returns the created user's identity (not including the password or its hash)

#### Scenario: Duplicate email
- **WHEN** a client submits `POST /api/v1/auth/register` with an email that already belongs to an existing user
- **THEN** the system rejects the request without creating a user or a workspace

### Requirement: Password storage never exposes plaintext
The system SHALL store passwords only as Argon2 hashes and SHALL NOT return a password or its hash in any API response or log.

#### Scenario: Registration response omits credentials
- **WHEN** a user registers or later fetches their own identity
- **THEN** the response body contains no password field and no password hash field

### Requirement: Login issues an access token and a refresh token
The system SHALL allow a registered user to log in with their email and password, and on success SHALL issue a short-lived access token and a refresh token.

#### Scenario: Successful login
- **WHEN** a client submits `POST /api/v1/auth/login` with the correct email and password
- **THEN** the system returns an access token and a refresh token

#### Scenario: Incorrect password
- **WHEN** a client submits `POST /api/v1/auth/login` with a registered email and an incorrect password
- **THEN** the system rejects the request and issues no tokens

### Requirement: Refresh tokens rotate on every use and detect reuse
The system SHALL allow a client to exchange a valid refresh token for a new access token and a new refresh token, invalidating the presented refresh token. Presenting a refresh token that has already been exchanged SHALL revoke every token descended from it.

#### Scenario: Successful refresh
- **WHEN** a client submits `POST /api/v1/auth/refresh` with a refresh token that has not yet been used
- **THEN** the system returns a new access token and a new refresh token, and the presented refresh token can no longer be used to obtain another pair

#### Scenario: Reuse of an already-exchanged refresh token
- **WHEN** a client submits `POST /api/v1/auth/refresh` with a refresh token that was already exchanged for a newer one
- **THEN** the system rejects the request and revokes every refresh token in that token's lineage, requiring the user to log in again

### Requirement: Logout revokes the current session
The system SHALL allow a client to end a session, after which the session's refresh token (and any token descended from it) SHALL no longer be usable.

#### Scenario: Successful logout
- **WHEN** an authenticated client submits `POST /api/v1/auth/logout` with their current refresh token
- **THEN** that refresh token and every token descended from it can no longer be used to obtain new tokens

### Requirement: Authenticated identity lookup
The system SHALL allow a client holding a valid access token to retrieve their own user identity and workspace.

#### Scenario: Fetch current identity
- **WHEN** a client submits `GET /api/v1/auth/me` with a valid access token
- **THEN** the system returns that user's identity and their workspace

#### Scenario: Missing or invalid access token
- **WHEN** a client submits `GET /api/v1/auth/me` without a valid access token
- **THEN** the system rejects the request
