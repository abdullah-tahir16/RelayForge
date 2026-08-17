## 1. Monorepo Skeleton

- [x] 1.1 Create `apps/frontend/`, `apps/backend/`, `apps/delivery-worker/` directories
- [x] 1.2 Create `packages/kafka-contracts/`, `packages/shared-config/` directories
- [x] 1.3 Create `docs/architecture/`, `docs/adr/` directories
- [x] 1.4 Add root `package.json` (private, workspace root) and `pnpm-workspace.yaml` declaring `apps/*` and `packages/*` as workspace packages

## 2. Local Development Infrastructure

- [x] 2.1 Write root `docker-compose.yml` wiring `frontend`, `backend`, `delivery-worker`, `postgres`, `kafka` (and optionally `kafka-ui`), per `documentation.md` §120
- [x] 2.2 Confirm `docker-compose.yml` has no Redis service (per design.md Decision 2)

## 3. LLM Context Document

- [x] 3.1 Write root `LLM_CONTEXT.md` covering: tech stack, the backend CQRS module layout, the frontend `core/infrastructure/presentation` layering, and cross-cutting security constraints (SSRF protection, signing secrets, idempotency)
- [x] 3.2 Call out the `web`→`frontend`, `api`→`backend` rename explicitly in `LLM_CONTEXT.md` so it doesn't read as inconsistent with `documentation.md`

## 4. OpenSpec Roadmap

- [x] 4.1 Write root `ROADMAP.md` with exactly four sections: Proposed, Doing, Done, Archived
- [x] 4.2 List `bootstrap-monorepo-scaffolding` itself under the section matching its actual state at time of writing, linking to its `proposal.md`
- [x] 4.3 Document the roadmap's manual-maintenance convention directly in `ROADMAP.md` (update on every propose/apply/archive) so it's discoverable without reading design.md

## 5. Verification

- [x] 5.1 Confirm the folder layout matches design.md Decision 1 (`apps/frontend`, `apps/backend`, `apps/delivery-worker`, `packages/kafka-contracts`, `packages/shared-config`, `docs/architecture`, `docs/adr`)
- [x] 5.2 Confirm `pnpm install` resolves the workspace (no build scripts required yet, just that `pnpm-workspace.yaml` is recognized)
- [x] 5.3 Run `openspec validate bootstrap-monorepo-scaffolding --strict` and fix any reported issues
