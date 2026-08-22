# LLM Context — RelayForge

Grounding for AI assistants working in this repo. For full product rationale, see `documentation.md` — this file is a distilled, current summary, not a replacement.

## Naming note: this repo diverges from `documentation.md` §122

`documentation.md` names the apps `apps/web` and `apps/api`. This repo uses:

```text
apps/web      → apps/frontend
apps/api      → apps/backend
apps/delivery-worker  (unchanged)
```

`packages/kafka-contracts` and `packages/shared-config` are unchanged. When cross-referencing `documentation.md`, mentally substitute the renamed paths — the doc's numbered sections are otherwise still authoritative.

## Tech stack

**Frontend** (`apps/frontend`): React, TypeScript, Material UI, TanStack Query, React Final Form + Zod, React Router, Axios, Socket.IO Client.

**Backend** (`apps/backend`, `apps/delivery-worker`): NestJS, TypeScript, NestJS CQRS, PostgreSQL, Apache Kafka, WebSockets/Socket.IO, Swagger/OpenAPI.

**Infra**: Docker, Docker Compose, Kafka, PostgreSQL, GitHub Actions. No Redis unless a genuine use case appears — Kafka owns the delivery pipeline, not Redis/BullMQ.

**Monorepo tooling**: pnpm workspaces (`pnpm-workspace.yaml` links `apps/*` and `packages/*`). No turborepo/nx yet — add only once there's a real build/test pipeline to orchestrate.

## Backend module structure (CQRS)

Each backend module follows Commands / Queries / Events:

```text
<module>/
├── commands/{impl,handlers}/
├── queries/{impl,handlers}/
├── events/{impl,handlers}/
├── dto/
├── entities/
├── repositories/
├── services/
├── <module>.controller.ts
└── <module>.module.ts
```

`src/kafka/` holds Kafka infrastructure only (producer, consumer setup, topic definitions, serialization) — no domain business rules there.

## Frontend structure

```text
src/
├── core/           # types, one folder per domain (Event, Endpoint, Delivery, ...)
├── infrastructure/ # api/ (pure HTTP calls), hooks/ (one query/mutation per file), useCases/
└── presentation/   # containers/ (render-only), hooks/ (feature state), components/
```

Material UI is used only through shared `App*` wrappers (`AppButton`, `AppTextField`, `AppDialog`, ...) — don't reach for raw MUI components inside features. Forms use React Final Form + Zod through `Form*` wrappers, not raw `<Field>`/`<TextField>` combinations.

## Cross-cutting security constraints

These apply to any code touching endpoints, events, or auth — see `documentation.md` §101-105 for full detail:

- **SSRF protection**: webhook destination URLs must be validated against localhost/private ranges/cloud metadata IPs before every HTTP request, including after redirects — a permitted public URL must not be allowed to redirect into a blocked range.
- **Secrets**: API keys are stored as SHA-256 hashes, never plaintext, shown once. Endpoint signing secrets are encrypted at rest.
- **Idempotency**: the event ingestion API must honor `Idempotency-Key`; Kafka consumers must independently guard against duplicate delivery creation (`eventId + endpointId` uniqueness) since delivery is at-least-once, not exactly-once.
- **Header redaction**: `Authorization`, `Cookie`, `Set-Cookie` and similar must never appear in logs or dashboard displays unredacted.

## Roadmap maintenance

`ROADMAP.md` at the repo root tracks every OpenSpec change under Proposed / Doing / Done / Archived. It is maintained **manually** — update it as part of running `/opsx:propose`, `/opsx:apply`, or `/opsx:archive`, moving the change's entry to the section matching its new state. Do not let it drift; a stale roadmap is a defect (see `openspec/specs/project-roadmap/spec.md` once archived, or the delta at `openspec/changes/bootstrap-monorepo-scaffolding/specs/project-roadmap/spec.md` before then).

## Delivery reliability

Webhook delivery uses one immediate attempt plus staged Kafka retries after 30 seconds, 2 minutes, 10 minutes, and 1 hour (five attempts total by default). The worker persists every attempt independently, redacts sensitive request/response headers, and stores at most 4 KiB of textual response preview. `PROCESSING` means a worker owns the current attempt; `RETRYING` means the next attempt is durably scheduled; `FAILED` means the configured attempts are exhausted. DLQ publication and manual replay remain separate follow-up work.

Delivery and retry messages are at-least-once. Database claims prevent concurrent sends for the same logical attempt, but a worker crash after the destination accepts a request and before the outcome is persisted can cause that request to be sent again after ownership expires. Do not describe RelayForge webhook delivery as exactly-once.

Until the planned WebSocket change lands, event detail/delivery/attempt views poll every 2 seconds while non-terminal and event lists poll every 5 seconds; polling stops for terminal data and in background tabs.
