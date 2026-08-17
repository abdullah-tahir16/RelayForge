## Why

Every event, endpoint, and delivery in RelayForge is scoped to a project, and client applications authenticate to the future event-ingestion API with a project-scoped API key (`documentation.md` §11-13, §20). `auth-minimal` gave every user exactly one workspace; this change lets that workspace hold projects, and lets each project mint revocable API keys — the next rung of the walking skeleton before endpoints, subscriptions, or event ingestion can exist.

## What Changes

- Add a `projects` module (CQRS): create, list, get, update, delete — every project is scoped to the caller's own workspace, resolved from their JWT (no multi-workspace-per-user yet, so there's no workspace parameter to trust or validate).
- Add an `api-keys` module (CQRS): generate a key for a project (`rf_live_` + random, full value shown once), list keys (masked, e.g. `rf_live_a9f8••••••••••`), revoke a key.
- Extract a shared opaque-token utility (`common/crypto/`) — generate a random token and its SHA-256 hash — and refactor `auth`'s refresh-token generation to use it instead of its own copy, so `api-keys` doesn't duplicate that logic. Refresh-token behavior is unchanged; this is a pure internal refactor.
- Extract `WorkspaceEntity` and its repository out of `auth/` into their own `workspaces` module, since `projects` and `api-keys` (and every later workspace-scoped capability) need to resolve "the caller's workspace" the same way `auth` already does. Also a pure internal refactor — no behavior change, no new migration (the table itself doesn't move).
- **No API-key validation guard yet.** Nothing consumes an API key until `event-ingestion-kafka-pipeline` exists — building it now would be dead code with no caller.

## Capabilities

### New Capabilities
- `projects`: create, list, get, update, and delete projects scoped to the caller's workspace.
- `api-keys`: generate, list (masked), and revoke project-scoped API keys; the full key value is shown only once, at creation.

### Modified Capabilities
(none — the crypto-util and workspaces-module extractions are internal refactors with no externally observable behavior change; `auth`'s existing spec and tests are unaffected)

## Impact

- First use of a `common/` (non-domain) module in the backend.
- Moves `WorkspaceEntity` and `WorkspacesRepository` from `auth/` to a new `workspaces/` module; `auth` now depends on `workspaces` instead of owning it.
- New tables: `projects` (id, workspaceId, name, key [an auto-generated, immutable display slug — distinct from and unrelated to API keys], description, createdAt, updatedAt) and `api_keys` (id, projectId, name, keyHash, keyPrefix, createdAt, lastUsedAt, revokedAt).
- Refactors `auth/services/token.service.ts` to call the shared crypto util; existing `auth-minimal` tests must continue passing unchanged, proving the refactor is behavior-preserving.
- No new API-key validation path — that lands with `event-ingestion-kafka-pipeline`.
