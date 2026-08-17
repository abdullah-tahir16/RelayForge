## 1. Shared Infrastructure Extraction

- [x] 1.1 Add `common/crypto/opaque-token.util.ts` with `generateOpaqueToken(byteLength)` and `hashOpaqueToken(raw)`
- [x] 1.2 Refactor `auth/services/token.service.ts` to use the shared util for refresh-token generation/hashing; re-run `auth-minimal`'s existing unit + e2e suites unmodified and confirm they still pass
- [x] 1.3 Create a `workspaces` module: move `WorkspaceEntity` and `WorkspacesRepository` out of `auth/`, export `WorkspacesRepository` from `WorkspacesModule`
- [x] 1.4 Update `auth` module/handlers to import `WorkspacesModule` instead of owning the entity directly; re-run `auth-minimal`'s existing suites again and confirm they still pass

## 2. Database Schema & Migrations

- [x] 2.1 Add `projects` TypeORM entity + migration (id, workspaceId, name, key [unique per workspace], description, createdAt, updatedAt)
- [x] 2.2 Add `api_keys` TypeORM entity + migration (id, projectId, name, keyHash, keyPrefix, createdAt, lastUsedAt, revokedAt), `projectId` with `ON DELETE CASCADE`

## 3. Projects Domain (CQRS)

- [x] 3.1 Implement a slug generator: kebab-case the name, disambiguate collisions within the same workspace with a short random suffix
- [x] 3.2 Implement `CreateProjectCommand` + handler: resolves caller's workspace, generates the key, persists the project
- [x] 3.3 Implement `GetProjectsQuery` + handler: lists projects scoped to caller's workspace
- [x] 3.4 Implement `GetProjectQuery` + handler: fetches one project, 404 if it belongs to another workspace
- [x] 3.5 Implement `UpdateProjectCommand` + handler: updates name/description only, leaves key unchanged, 404 if another workspace's project
- [x] 3.6 Implement `DeleteProjectCommand` + handler: deletes the project; confirm the DB cascade removes its `api_keys` rows

## 4. Projects API

- [x] 4.1 Wire `POST /api/v1/projects` (guarded) to `CreateProjectCommand`
- [x] 4.2 Wire `GET /api/v1/projects` (guarded) to `GetProjectsQuery`
- [x] 4.3 Wire `GET /api/v1/projects/:id` (guarded) to `GetProjectQuery`
- [x] 4.4 Wire `PATCH /api/v1/projects/:id` (guarded) to `UpdateProjectCommand`
- [x] 4.5 Wire `DELETE /api/v1/projects/:id` (guarded) to `DeleteProjectCommand`

## 5. API Keys Domain (CQRS)

- [x] 5.1 Implement `GenerateApiKeyCommand` + handler: verifies caller owns the project, generates `rf_live_` + random via the shared crypto util, persists hash + prefix, returns the full value once
- [x] 5.2 Implement `GetApiKeysQuery` + handler: lists keys for a project the caller owns, masked (prefix + metadata only, never hash or full value)
- [x] 5.3 Implement `RevokeApiKeyCommand` + handler: verifies caller owns the key's project, sets `revokedAt`

## 6. API Keys API

- [x] 6.1 Wire `POST /api/v1/projects/:projectId/api-keys` (guarded) to `GenerateApiKeyCommand`
- [x] 6.2 Wire `GET /api/v1/projects/:projectId/api-keys` (guarded) to `GetApiKeysQuery`
- [x] 6.3 Wire `DELETE /api/v1/api-keys/:id` (guarded) to `RevokeApiKeyCommand`

## 7. Tests

- [x] 7.1 Unit test: slug generation and collision disambiguation
- [x] 7.2 Unit test: API key generation produces the documented `rf_live_` format and a matching prefix
- [x] 7.3 Integration test (Supertest): project create → list → get → update → delete, including cross-workspace 404s from `specs/projects/spec.md`
- [x] 7.4 Integration test (Supertest): API key generate → list (masked, no hash/full value ever present) → revoke → cascade-delete via project deletion, including cross-workspace 404s from `specs/api-keys/spec.md`

## 8. Verification

- [x] 8.1 Run migrations against the live `postgres` service and confirm they apply cleanly on top of `auth-minimal`'s existing schema
- [x] 8.2 Manually exercise the full flow with curl: register/login (existing) → create project → generate key → list keys (confirm masked) → revoke key → delete project (confirm keys gone)
- [x] 8.3 Run `openspec validate project-and-api-key-minimal --strict` and fix any reported issues
