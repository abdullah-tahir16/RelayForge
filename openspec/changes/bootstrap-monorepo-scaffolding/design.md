## Context

The repo currently contains only `documentation.md` (the frozen vision doc) and OpenSpec scaffolding — no code, no folder structure, no dev infrastructure. `documentation.md` §122 already proposes a monorepo layout (`apps/web`, `apps/api`, `apps/delivery-worker`, `packages/kafka-contracts`, `packages/shared-config`) and §120 an initial docker-compose. This change adapts that layout (renaming `web`→`frontend`, `api`→`backend`) rather than inventing a new one, and adds two root docs the vision doc doesn't cover: `LLM_CONTEXT.md` and `ROADMAP.md`. See `proposal.md` for the motivation.

## Goals / Non-Goals

**Goals:**
- Stand up the folder skeleton every future feature change will build inside.
- Stand up local dev infra config (docker-compose) matching `documentation.md` §120.
- Give AI assistants a short, current grounding doc instead of re-deriving conventions from a 3000+ line vision doc each time.
- Give humans and agents a single place to see every change's lifecycle state, satisfying the `project-roadmap` spec.

**Non-Goals:**
- No application code, no Dockerfiles — that belongs to the first change that adds real code to `apps/backend`, `apps/frontend`, or `apps/delivery-worker`.
- No task-runner/build-caching tool (turborepo, nx) — pnpm workspaces alone is enough to link `apps/*` and `packages/*`; a task runner can be added later if build times or shared caching become a real need.
- No automated roadmap generation script — see Decisions below.
- No CI pipeline — `documentation.md` §129 describes it, but wiring it needs runnable apps first.

## Decisions

**1. Folder layout — rename, don't restructure.**
Use `apps/frontend`, `apps/backend`, `apps/delivery-worker`, `packages/kafka-contracts`, `packages/shared-config`, `docs/architecture/`, `docs/adr/`. This is `documentation.md` §122 with `web`→`frontend` and `api`→`backend`, keeping `delivery-worker` as its own app so the API/worker process separation from §121 stays intact.
*Alternative considered:* collapsing API + worker into one `backend` app (the literal "2 folders" first ask). Rejected once clarified — the user wants the process separation kept, just the naming simplified.

**2. Local infra — docker-compose only, no Redis.**
`docker-compose.yml` wires `frontend`, `backend`, `delivery-worker`, `postgres`, `kafka`, and optionally `kafka-ui`, per §120. No Redis/BullMQ — §3 explicitly says Redis shouldn't be introduced until a genuine use case appears, and Kafka already owns the delivery pipeline.

**3. `LLM_CONTEXT.md` — a standalone root file, not the OpenSpec config.**
Content is distilled from `documentation.md`: tech stack, the CQRS module structure, the frontend `core/infrastructure/presentation` layering, and the cross-cutting security constraints (SSRF protection, signing, idempotency). It explicitly notes the `web`→`frontend`, `api`→`backend` rename so a reader comparing it against `documentation.md` isn't confused by the mismatch.
*Alternative considered:* populating `openspec/config.yaml`'s `context:` field instead. Rejected per explicit user choice — a root-level file is human-browsable outside the OpenSpec tooling, whereas the config field only feeds artifact generation.

**4. `ROADMAP.md` — four fixed sections, manually maintained for now.**
Sections are exactly Proposed / Doing / Done / Archived (matching the `project-roadmap` spec). Each entry links to the change's `proposal.md` (or archived location). Mapping from OpenSpec state to section:
- Proposed: planning artifacts (`proposal`/`specs`/`design`/`tasks`) not all `done` yet.
- Doing: planning complete, `tasks.md` has a mix of checked/unchecked items.
- Done: `tasks.md` fully checked, change still under `openspec/changes/` (not yet archived).
- Archived: change directory has moved under `openspec/changes/archive/`.

Maintenance is manual: whoever runs the propose/apply/archive workflows updates `ROADMAP.md` as part of that workflow. `LLM_CONTEXT.md` calls this out so agents remember to do it.
*Alternative considered:* a script that derives the roadmap from `openspec list --json`/`openspec status --json`. Deferred — there's no package.json or build tooling yet to host such a script; worth revisiting once change volume makes manual upkeep error-prone.

**5. Monorepo tooling — pnpm workspaces.**
Root `package.json` (private, workspace root) plus `pnpm-workspace.yaml` declaring `apps/*` and `packages/*` as workspace packages. This is the minimum needed to let `apps/backend` depend on `packages/kafka-contracts` without publishing it.
*Alternative considered:* turborepo or nx on top of pnpm. Rejected for now — no build/test pipeline exists yet to cache or orchestrate, so the extra tooling would have nothing to do. Revisit once `apps/*` have real build and test scripts.

## Risks / Trade-offs

- **[Manual roadmap upkeep drifts out of sync]** → Mitigation: the spec requirement makes staleness a defect, and `LLM_CONTEXT.md` instructs agents to update `ROADMAP.md` as part of every propose/apply/archive step.
- **[`documentation.md` still says `apps/web`/`apps/api`]** → Mitigation: `LLM_CONTEXT.md` states the rename explicitly so it's the first thing a reader (human or agent) sees before hitting the mismatch.
- **[docker-compose defined before any app has a Dockerfile]** → Mitigation: `tasks.md` scopes this change to skeleton/config only; each app's own bootstrapping change adds its Dockerfile and wires it in.

