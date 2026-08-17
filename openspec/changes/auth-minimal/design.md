## Context

`apps/backend` currently contains only a `.gitkeep` (from `bootstrap-monorepo-scaffolding`) — no application code exists anywhere in the repo yet. This is the first change to write real backend code. `documentation.md` §64 specifies the auth endpoints and Argon2/JWT/refresh-rotation; §77 specifies the CQRS module shape (`commands/`, `queries/`, `entities/`, `repositories/`); §4 defines the Workspace → Project product model. See `proposal.md` for motivation, and `specs/auth/spec.md` for the exact behavior contract this design implements.

Two decisions below were settled in exploration before this proposal was written, not invented here: workspaces exist in the schema from day one, and refresh-token rotation is in scope now rather than deferred.

## Goals / Non-Goals

**Goals:**
- Stand up the first real NestJS app in `apps/backend`, following the CQRS module structure in `documentation.md` §77.
- Ship the smallest real (not stubbed) auth slice satisfying every requirement in `specs/auth/spec.md`.
- Shape the schema so no later capability needs a migration to add multi-tenancy.

**Non-Goals:**
- No team membership, invites, or RBAC roles (OWNER/DEVELOPER/VIEWER) — that's `workspaces-and-team-rbac` (Phase 4 in `ROADMAP.md`).
- No password reset or email verification.
- No `/health` readiness endpoint — deferred to `event-ingestion-kafka-pipeline`, which is the first change that actually needs to report Postgres/Kafka readiness together.

## Decisions

**1. ORM — TypeORM.**
`documentation.md` §77's module structure already assumes `entities/` and `repositories/` folders per module; TypeORM's decorated entity classes map directly onto that shape, and its migration tooling covers the `users`/`workspaces`/`refresh_tokens` tables this change introduces.
*Alternative considered:* Prisma. Rejected for now — its generated-client model doesn't map as directly onto the documented entities/repositories folder convention, though it remains a fine choice if the team later wants schema-first migrations across the board.

**2. Workspace exists from day one.**
`workspaces` table, 1:1 with `users`, created in the same transaction as the user during registration. Every future workspace-scoped table (`projects`, `api_keys`, `endpoints`, ...) gets a real `workspaceId` foreign key from its own first migration, never a backfill. Team membership (multiple users per workspace) is deferred, but the shape doesn't change when it arrives — `workspaces-and-team-rbac` only adds a `workspace_members` join table; it doesn't touch existing `workspaceId` columns.
*Alternative considered:* defer workspaces entirely, hang `projects` off `userId` directly. Rejected — it would force a schema migration (and data backfill) onto whatever real data exists by the time `workspaces-and-team-rbac` lands.

**3. Refresh-token rotation is in scope now.**
`refresh_tokens` stores a hash of the current token (never the raw token), a `familyId`, `rotatedAt`, and `revokedAt`. Every `/auth/refresh` call issues a new token in the same family and marks the presented one rotated; presenting an already-rotated token revokes the entire family.
*Alternative considered:* a single long-lived refresh token with no rotation. Rejected — `documentation.md` §64 explicitly calls out rotation for v0.1, and retrofitting rotation onto already-issued, live sessions is a harder migration than building it in from the start.

**4. Token lifetimes.**
Access JWT: 15 minutes. Refresh token: 30 days. Not specified in `documentation.md`; reasonable defaults for a walking skeleton, and changing either later is a config change, not a schema change.

**5. Auth stack — `@nestjs/jwt` + Passport JWT strategy, `argon2` package for hashing.**
These are NestJS's own documented building blocks for exactly this problem; no real alternative is worth debating here the way TypeORM vs. Prisma was.

## Risks / Trade-offs

- **[No RBAC yet — every authenticated request is fully privileged within its workspace]** → Mitigation: acceptable for a single-user walking skeleton; §9's role model is deferred to `workspaces-and-team-rbac`, not abandoned.
- **[No password reset flow]** → Mitigation: fine during the walking-skeleton phase with no real users; must exist before any real multi-user deployment.
- **[This is the first migration set in the repo]** → Mitigation: kept small (3 tables) and scoped tightly in tasks.md so mistakes are cheap to fix before anything else depends on the schema.
