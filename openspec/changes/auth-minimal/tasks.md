## 1. Backend App Bootstrap

- [x] 1.1 Initialize the NestJS application in `apps/backend` (package.json, tsconfig, `main.ts`, root `AppModule`)
- [x] 1.2 Add config loading (env-based) for Postgres connection string, JWT secret, access/refresh token lifetimes
- [x] 1.3 Wire up TypeORM connection to Postgres using the config from 1.2

## 2. Database Schema & Migrations

- [x] 2.1 Add `users` TypeORM entity + migration (id, email [unique], passwordHash, createdAt, updatedAt)
- [x] 2.2 Add `workspaces` TypeORM entity + migration (id, ownerUserId [unique, references users], name, createdAt, updatedAt)
- [x] 2.3 Add `refresh_tokens` TypeORM entity + migration (id, userId, tokenHash, familyId, rotatedAt, revokedAt, createdAt)

## 3. Auth Domain (CQRS)

- [x] 3.1 Implement `RegisterUserCommand` + handler: creates a user and its workspace in one transaction, hashes password with Argon2, rejects duplicate emails
- [x] 3.2 Implement `LoginCommand` + handler: verifies password, issues access JWT + refresh token, creates the refresh token's initial family record
- [x] 3.3 Implement `RefreshTokenCommand` + handler: validates and rotates a refresh token; on reuse of an already-rotated token, revokes the entire family
- [x] 3.4 Implement `LogoutCommand` + handler: revokes the current refresh token's family
- [x] 3.5 Implement `GetCurrentUserQuery` + handler: returns the authenticated user's identity and workspace

## 4. Auth API

- [x] 4.1 Implement JWT access-token strategy (Passport) and an auth guard for protected routes
- [x] 4.2 Wire `POST /api/v1/auth/register` to `RegisterUserCommand`
- [x] 4.3 Wire `POST /api/v1/auth/login` to `LoginCommand`
- [x] 4.4 Wire `POST /api/v1/auth/refresh` to `RefreshTokenCommand`
- [x] 4.5 Wire `POST /api/v1/auth/logout` (guarded) to `LogoutCommand`
- [x] 4.6 Wire `GET /api/v1/auth/me` (guarded) to `GetCurrentUserQuery`
- [x] 4.7 Confirm no response (register, login, or me) ever includes a password or password hash field

## 5. Tests

- [x] 5.1 Unit test: Argon2 hashing/verification
- [x] 5.2 Unit test: refresh token rotation (valid rotation succeeds, reused token revokes the family)
- [x] 5.3 Integration test (Supertest): register → login → me → refresh → logout, covering both success and rejection paths from `specs/auth/spec.md`

## 6. Verification

- [x] 6.1 Run `apps/backend` against the `postgres` service from `docker-compose.yml` and confirm migrations apply cleanly on an empty database
- [x] 6.2 Manually exercise the full flow (register → login → me → refresh → reuse-rejected → logout) with curl or the Swagger UI
- [x] 6.3 Run `openspec validate auth-minimal --strict` and fix any reported issues
