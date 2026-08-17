## Context

`auth-minimal` shipped `users`, `workspaces` (1:1 with users), and `refresh_tokens`, plus a `JwtAuthGuard` protecting management endpoints. `documentation.md` §11-13 define `projects` and `api_keys`; §65-66 define their routes. See `proposal.md` for motivation and `specs/projects/spec.md` / `specs/api-keys/spec.md` for the exact behavior contract this design implements.

Three decisions below were settled in exploration before this proposal was written: extract the shared opaque-token hashing utility now rather than duplicate it, extract a `workspaces` module now rather than let unrelated modules reach into `auth/`, and do not build an API-key validation guard yet since nothing calls it until `event-ingestion-kafka-pipeline` exists.

## Goals / Non-Goals

**Goals:**
- Let a project hold API keys, both scoped to the caller's workspace, satisfying every requirement in `specs/projects/spec.md` and `specs/api-keys/spec.md`.
- Make "resolve the caller's workspace" and "hash an opaque token" reusable, one-time pieces of infrastructure — every later capability that needs either should import, not duplicate.

**Non-Goals:**
- No API-key validation guard — deferred to `event-ingestion-kafka-pipeline`, the first change with an endpoint that actually needs to authenticate a client application (not a user).
- No multi-workspace-per-user — workspace is still resolved as "the one workspace the caller's user owns," per `auth-minimal`.
- No project name uniqueness constraint — `documentation.md` §11 doesn't require it, so this doesn't invent one. Only the generated `key` slug is unique per workspace.
- No key rotation/expiry policy beyond manual revocation — not in scope for either spec.

## Decisions

**1. Extract `common/crypto/opaque-token.util.ts`.**
`generateOpaqueToken(byteLength)` returns `{ raw, hash }`; `hashOpaqueToken(raw)` returns the SHA-256 hex digest. `auth/services/token.service.ts` is refactored to call this instead of its own `crypto.randomBytes`/`createHash` calls — refresh-token behavior is unchanged, and `auth-minimal`'s existing unit/e2e tests must pass unmodified as proof. `api-keys` uses the same util, prepending `rf_live_` to the raw value before hashing the full string (so the literal prefix is itself covered by the hash, not just decoration).
*Alternative considered:* let `api-keys` duplicate a 3-line hash helper and extract later. Rejected — this is exactly the same operation `auth` already needed once; duplicating it now just guarantees a future cleanup change for zero benefit today.

**2. Extract a `workspaces` module.**
Move `WorkspaceEntity` and `WorkspacesRepository` from `auth/` into a new top-level `workspaces/` module (matching `documentation.md` §77's module list, where `workspaces/` is already listed separately from `auth/`). `WorkspacesModule` exports `WorkspacesRepository` and registers `WorkspaceEntity` via `TypeOrmModule.forFeature`. `AuthModule` now imports `WorkspacesModule` instead of owning the entity; `projects` and `api-keys` import it too, for the same "resolve the caller's workspace" lookup `auth` already needed for `/me`. No migration changes — the table doesn't move, only the TypeScript file and its NestJS module registration do.
*Alternative considered:* have `projects`/`api-keys` import `AuthModule` directly to reach `WorkspacesRepository`. Rejected — `auth` (sessions, credentials) and `workspaces` (a shared domain concept) are different concerns; importing all of `auth` just to resolve a workspace id is a module-boundary smell that would only get worse as more modules need it.

**3. No API-key validation guard yet.**
`api-keys` ships generate/list/revoke only. Every route in this change is protected by the existing `JwtAuthGuard` (a user session), not a new API-key guard — there is no endpoint yet that a generated key is meant to authenticate against.
*Alternative considered:* build the guard now so "API keys" feels complete in one change. Rejected — it would be dead code with no caller until `event-ingestion-kafka-pipeline` lands, and deferring it costs nothing (new code in a later change, not rework of this one).

**4. Project `key` is an auto-generated, immutable slug — unrelated to API keys.**
`documentation.md` §11 lists `key` as a project field but doesn't specify how it's produced. Decision: kebab-case-slugify the name at creation time, disambiguate collisions within the same workspace by appending a short random suffix, and never allow it to change (an update touches `name`/`description` only). This field shares no code path with `api_keys` — the identical word is a documentation-doc naming coincidence, not a relationship, and the two are namespaced into different entities/modules to keep that unambiguous in code.

**5. Project deletion cascades to API keys.**
`DELETE /api/v1/projects/:id` hard-deletes the project row and cascade-deletes its `api_keys` rows (DB-level `ON DELETE CASCADE`, not an app-level revoke-then-delete step). `documentation.md` doesn't list a soft-delete field for projects, and no capability yet reads deleted-project history (audit logs are Phase 4), so there's nothing that needs the API key rows to survive as "revoked" — they're genuinely gone.
*Alternative considered:* soft-delete the project and mark its keys revoked instead of deleting rows. Rejected for now — it would need a `deletedAt` field `documentation.md` never specifies, and there's no reader for that history yet; revisit once the audit-log capability (Phase 4) actually needs it.

**6. API key format.**
`rf_live_` + 32 hex characters (`crypto.randomBytes(16)`, via the shared util). `keyPrefix` stores `rf_live_` plus the first 4 hex characters, matching `documentation.md` §13's dashboard example (`rf_live_a9f8••••••••••`); listings render the prefix followed by a fixed run of `•`.

**7. Authorization pattern.**
Every command/query in `projects` and `api-keys` takes the caller's `userId`; the handler resolves `workspaceId` via `WorkspacesRepository.findByOwnerUserId` and scopes its query by it. A project or key belonging to a different workspace is treated as not found (404), not forbidden (403) — consistent with not confirming the existence of resources outside the caller's workspace.

## Risks / Trade-offs

- **[Refactoring already-shipped `auth` code]** → Mitigation: both extractions (crypto util, workspaces module) are moves/delegations with no intended behavior change; `auth-minimal`'s existing test suite re-running unmodified and green is the acceptance bar for "no regression," not a new round of manual verification.
- **[Cascade-deleting API keys loses their history]** → Mitigation: acceptable now (no reader depends on it); flagged above as the first thing to revisit if/when audit logging lands.
- **[404-vs-403 for cross-workspace access]** → Mitigation: deliberate — avoids confirming that a resource id exists at all to a caller who doesn't own it.
