## Why

RelayForge is currently just a vision document (`documentation.md`) — there is no code, no folder structure, and no way to see at a glance which OpenSpec changes are proposed, in progress, done, or archived. Before any feature work (auth, events, Kafka pipeline, etc.) can start, the repo needs its base skeleton, a grounding doc for AI assistants working in the codebase, and a living roadmap.

## What Changes

- Create the monorepo skeleton: `apps/frontend` (the React app, called "web" in `documentation.md` §122), `apps/backend` (the NestJS API, called "api" in the doc), `apps/delivery-worker` (unchanged), `packages/kafka-contracts`, `packages/shared-config`, `docs/architecture`, `docs/adr`.
- Configure the repo as a pnpm workspace (root `package.json` + `pnpm-workspace.yaml`) linking `apps/*` and `packages/*`.
- Add local dev infrastructure: `docker-compose.yml` wiring `frontend`, `backend`, `delivery-worker`, `postgres`, `kafka` (optionally `kafka-ui`), per `documentation.md` §120.
- Add `LLM_CONTEXT.md` at the repo root — tech stack, conventions, and structural rules for AI assistants working in this repo, distilled from `documentation.md`.
- Add `ROADMAP.md` at the repo root — an OpenSpec-driven roadmap listing every change grouped by lifecycle state (Proposed, Doing, Done, Archived), replacing reliance on the static v0.1–v1.0 phase list frozen in `documentation.md` §134-139 as the way to track live progress.

## Capabilities

### New Capabilities
- `project-roadmap`: the repo must maintain a `ROADMAP.md` that categorizes every OpenSpec change into Proposed / Doing / Done / Archived, and that categorization must stay current as changes move through those states.

### Modified Capabilities
(none — no existing specs exist yet)

## Impact

- No application code exists yet, so this introduces no breaking changes.
- Establishes the folder layout (`apps/frontend`, `apps/backend`, `apps/delivery-worker`, `packages/*`) that every future feature change will build inside.
- Introduces root-level `docker-compose.yml`, `LLM_CONTEXT.md`, and `ROADMAP.md`.
- Everything except the roadmap-tracking behavior is pure scaffolding (folders, infra config, documentation) with no runtime behavior of its own.
