## Why

RelayForge has no application code yet — only the vision doc and the monorepo skeleton from `bootstrap-monorepo-scaffolding`. Every future capability (projects, API keys, endpoints, events) is scoped under a workspace and requires an authenticated identity, so auth has to exist first. This change ships the smallest real auth slice — not a stub — that later capabilities can build on without a schema migration.

## What Changes

- Bootstrap the first real NestJS application in `apps/backend` (this is the first change writing code there): app module, config loading, Postgres connection.
- Add an `auth` module (CQRS): register, login, refresh, logout, and current-user lookup.
- Add `users`, `workspaces`, and `refresh_tokens` Postgres tables. Each user gets exactly one workspace, auto-created at registration — no team membership, invites, or roles yet.
- Add API endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- Passwords are hashed with Argon2. Access tokens are short-lived JWTs. Refresh tokens rotate on every use; presenting an already-used refresh token revokes the whole token family (reuse/theft detection).

## Capabilities

### New Capabilities
- `auth`: user registration, login, session refresh with rotation, logout, and identity lookup — every user automatically owns exactly one workspace.

### Modified Capabilities
(none — first capability with real application code)

## Impact

- First change to add real code to `apps/backend` (NestJS bootstrap, database entities and migrations).
- Establishes `users`, `workspaces`, and `refresh_tokens` tables. Every later workspace-scoped capability (projects, API keys, endpoints) gets a real `workspaceId` foreign key from its own first migration — never a backfill.
- No RBAC or team roles yet — every authenticated request is fully privileged within its own workspace. Multi-member workspaces and the OWNER/DEVELOPER/VIEWER roles (`documentation.md` §9) land in the later `workspaces-and-team-rbac` change.
- No password reset or email verification flow — out of scope for this minimal slice.
- No `/health` readiness endpoint yet — deferred to the change that actually needs to report Postgres/Kafka readiness (`event-ingestion-kafka-pipeline`).
