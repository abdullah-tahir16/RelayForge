## Why

Endpoints and their event subscriptions are the destination side of RelayForge's webhook delivery pipeline (`documentation.md` §14-19) — the next rung after `project-and-api-key-minimal`, and the last piece of configuration needed before `event-ingestion-kafka-pipeline` can route and deliver anything.

## What Changes

- Add an `endpoints` module (CQRS): register, list, get, update, delete, enable, disable — every endpoint scoped to a project the caller's workspace owns.
- Add a `subscriptions` module (CQRS): subscribe an endpoint to an event pattern (exact type or wildcard), list, unsubscribe — scoped via endpoint → project → workspace.
- Endpoint URL validation: HTTP/HTTPS syntax check (§15) plus a literal-hostname blocklist (`localhost`, `127.0.0.1`, `169.254.169.254`, common private-range literals) as a cheap first layer. Full SSRF protection (DNS resolution at request time, redirect interception) remains its own later change, `ssrf-and-redirect-protection` — this is deliberately not that.
- **No wildcard-matching evaluation logic yet.** This change stores and syntax-validates `eventPattern`; the "does event X match pattern Y" matcher has no caller until `event-ingestion-kafka-pipeline` performs routing (§29) — building it now would be dead code, the same reasoning `project-and-api-key-minimal` applied to deferring the API-key validation guard.
- **No `POST /endpoints/:id/test` yet.** Testing an endpoint means actually delivering to it (§49, §100), which needs a delivery pipeline that doesn't exist yet.
- **No signing-secret fields yet.** `signingSecretHash`/`signingSecretEncrypted` belong to `hmac-signing-and-secret-rotation`.

## Capabilities

### New Capabilities
- `endpoints`: register, list, get, update, delete, enable, and disable webhook endpoints scoped to the caller's workspace.
- `subscriptions`: subscribe an endpoint to an event pattern (exact or wildcard), list, and unsubscribe.

### Modified Capabilities
(none)

## Impact

- New tables: `endpoints` (scoped via `projectId`, cascade-deleted with its project — same pattern `api_keys` already uses) and `subscriptions` (scoped via `endpointId`, cascade-deleted with its endpoint).
- Extends the existing three-hop authorization pattern (`workspace` → `project` → child resource) one hop further: `workspace` → `project` → `endpoint` → `subscription`.
- "A disabled endpoint must not receive new deliveries" (§16) is *not* a testable requirement of this change — nothing delivers anything yet. It becomes a requirement of `event-ingestion-kafka-pipeline`'s routing logic, which is the capability that will actually filter by endpoint state.
