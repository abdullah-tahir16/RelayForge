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
- **Secrets**: API keys are stored as SHA-256 hashes, never plaintext, shown once. Endpoint signing secrets are AES-256-GCM encrypted at rest (`select: false` columns) with a SHA-256 hash kept alongside for identity checks; every endpoint response goes through an explicit safe DTO/mapper, never a raw entity, so plaintext, ciphertext, and full hashes never leak through a normal read. Plaintext is disclosed only once, in the create/rotate response body — the dashboard holds it in ephemeral component state only, never in a cached query, local/session storage, or logs. Rotation is immediate (no grace period or dual-signature window); the prior secret keeps signing only the runs that already snapshotted it (see Delivery reliability below). `SIGNING_SECRET_ENCRYPTION_KEY` — one shared 32-byte base64 key required identically by the backend, its migrations, and the delivery worker — decrypts this material; see `docs/operations/signing-secret-encryption-key.md` for how operators generate and inject it in production, and never let it appear in logs.
- **Idempotency**: the event ingestion API must honor `Idempotency-Key`; Kafka consumers must independently guard against duplicate delivery creation (`eventId + endpointId` uniqueness) since delivery is at-least-once, not exactly-once.
- **Header redaction**: `Authorization`, `Cookie`, `Set-Cookie` and similar must never appear in logs or dashboard displays unredacted.

## Roadmap maintenance

`ROADMAP.md` at the repo root tracks every OpenSpec change under Proposed / Doing / Done / Archived. It is maintained **manually** — update it as part of running `/opsx:propose`, `/opsx:apply`, or `/opsx:archive`, moving the change's entry to the section matching its new state. Do not let it drift; a stale roadmap is a defect (see `openspec/specs/project-roadmap/spec.md` once archived, or the delta at `openspec/changes/bootstrap-monorepo-scaffolding/specs/project-roadmap/spec.md` before then).

## Delivery reliability

Each `(event_id, endpoint_id)` pair has one logical Delivery and one or more immutable Delivery Runs beneath it. Run 1 is `INITIAL`; every user replay creates the next `MANUAL` run under the same Delivery and records the requesting user when available. Delivery is the latest-run summary used by lists and Event aggregation. Its `attempt_count` remains globally monotonic, while each run has its own snapshotted attempt limit/count and each Delivery Attempt records both the global attempt number and a run-relative number beginning at 1.

Webhook delivery uses one immediate attempt plus staged Kafka retries after 30 seconds, 2 minutes, 10 minutes, and 1 hour (five attempts per run by default). The worker persists every attempt independently, redacts sensitive request/response headers, and stores at most 4 KiB of textual response preview. `PROCESSING` means a worker owns the current run attempt; `RETRYING` means the next run attempt is durably scheduled. Newly exhausted runs and their logical Delivery become `DEAD_LETTERED`; `FAILED` remains a terminal replay-eligible compatibility status for deliveries that predate DLQ support. Event aggregation treats both as terminal failures and counts each logical Delivery once from its latest run.

Delivery-job v3 carries explicit run identity, global/run-relative attempt numbers, and a stable run-aware job ID. Consumers still accept retained v1/v2 jobs, but bind them only to the initial run so an old message can never claim a manual replay.

Delivery-job v4 adds an encrypted snapshot of the endpoint's signing secret (`endpointSigningSecretEncrypted` + version) to every v3 field; it is the only job version the worker will sign. Retained v1-v3 jobs keep normalizing and sending exactly as before — unsigned, since they carry no signing-secret snapshot. An initial run and a manual replay run each snapshot whichever secret is current for the endpoint at the moment that run is created; every retry of that run reuses the same snapshot even if the endpoint's secret rotates in between, so one run never switches signing secrets mid-flight. The worker never reads endpoint rows itself — it only decrypts the secret it was handed in the job — and it fails closed (no HTTP request, no offset commit, secret-free diagnostic only) if that encrypted material is missing, malformed, or fails GCM authentication. Every signed attempt sends `X-RelayForge-Signature: v1=<hex>` computed over `<timestamp>.<raw-body>` using the same timestamp as `X-RelayForge-Timestamp`; persisted request headers redact the signature value case-insensitively. See `docs/webhook-signatures.md` for the full wire format and a runnable verifier.

PostgreSQL is the dashboard's canonical dead-letter read model. Every newly exhausted run publishes a secret-free version-1 notification to `relayforge.dlq`, keyed by project and using the run UUID as stable `deadLetterId`. The notification contains identifiers, counts, failure classification/status, and time only—never event payload, endpoint URL, request/response bodies, credentials, or headers. DLQ publication is at-least-once: exhaustion commits first, Kafka publishes next, `dlq_published_at` is marked conditionally, and only then may the source delivery offset commit. A source redelivery republishes an unmarked dead letter without resending the webhook; publish/mark/commit crashes can therefore produce duplicate Kafka notifications with the same stable ID.

Authenticated users can list `/api/v1/projects/:projectId/dlq`, inspect `/api/v1/deliveries/:deliveryId/runs`, replay one eligible terminal Delivery (including `SUCCEEDED`), or replay failed/dead-lettered Deliveries for one Event. Replay preserves prior runs/attempts, uses the immutable Event payload plus the Endpoint's current enabled configuration, and reopens the parent Event as `PROCESSING`. Replay state commits before Kafka publication. If initial-job publication fails, the API returns a retryable failure and the next replay request resumes the same unpublished manual run; autonomous repair of this database/Kafka gap remains deferred to `transactional-outbox`.

Delivery and retry messages are at-least-once. Database claims prevent concurrent sends for the same logical attempt, but a worker crash after the destination accepts a request and before the outcome is persisted can cause that request to be sent again after ownership expires. Do not describe RelayForge webhook delivery as exactly-once.

Until the planned WebSocket change lands, event detail/delivery/run/attempt views poll every 2 seconds while non-terminal, and Event/DLQ lists poll every 5 seconds while visible. Polling stops for terminal data and in background tabs.
