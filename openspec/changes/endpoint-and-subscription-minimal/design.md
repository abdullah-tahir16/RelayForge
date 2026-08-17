## Context

`project-and-api-key-minimal` established the `workspace` → `project` → child-resource authorization pattern (resolve caller's workspace, verify project ownership, scope the query) and cascade-delete-on-parent-removal as the default for child tables. `documentation.md` §14-19 define endpoints and subscriptions; §67-68 define their routes. See `proposal.md` for motivation and `specs/endpoints/spec.md` / `specs/subscriptions/spec.md` for the exact behavior contract.

Three decisions were settled in exploration before this proposal was written: a literal-hostname blocklist now (not full SSRF protection), `timeoutMs` in scope now while signing-secret fields are deferred, and — refined while writing the spec, see Decision 3 below — the wildcard *matcher* itself is deferred, not just its "which style of matching" question.

## Goals / Non-Goals

**Goals:**
- Extend the authorization pattern one hop further: `workspace` → `project` → `endpoint` → `subscription`.
- Close the "arbitrary URL sits unprotected in the database" gap cheaply, without duplicating the real SSRF-protection change.
- Satisfy every requirement in `specs/endpoints/spec.md` and `specs/subscriptions/spec.md`.

**Non-Goals:**
- No DNS-resolution-based SSRF protection or redirect interception — `ssrf-and-redirect-protection` (Phase 3).
- No wildcard-pattern *matching* logic (evaluating whether an event matches a pattern) — only pattern storage and syntax validation. The matcher belongs to `event-ingestion-kafka-pipeline`'s routing consumer (§29), which is its only caller.
- No `/endpoints/:id/test` — needs a delivery pipeline that doesn't exist yet.
- No signing-secret fields — `hmac-signing-and-secret-rotation`.
- No enforcement that disabled endpoints skip delivery — nothing delivers yet; that's `event-ingestion-kafka-pipeline`'s requirement to satisfy, not this change's.

## Decisions

**1. Literal-hostname blocklist, not full SSRF protection.**
At write time (create and update), validate the URL's scheme (`http`/`https` only) and syntax, then reject if the hostname literally matches `localhost`, `127.0.0.1`, `169.254.169.254`, or an equivalent loopback/link-local literal — a plain string/IP-literal comparison, no DNS resolution. This is cheap and closes the most obvious gap; it is explicitly not a substitute for `ssrf-and-redirect-protection`, which must still handle DNS rebinding and redirect-following before any endpoint is ever actually dialed.
*Alternative considered:* defer all URL-destination checks to that later change, matching how the API-key guard was deferred. Rejected — that guard had zero caller before its change; this field is written and stored by real user input today, so the risk window is open now, not hypothetical.

**2. `timeoutMs` in scope now; signing-secret columns deferred.**
`documentation.md` §99's Endpoint Form lists Timeout alongside Name/URL/Enabled as core config. `signingSecretHash`/`signingSecretEncrypted` belong to a feature (`hmac-signing-and-secret-rotation`) that doesn't exist yet, and adding those nullable columns later is a trivial migration, not a backfill — so there's no "avoid future migration pain" argument for including them now, unlike the workspace-schema decision in `auth-minimal`.

**3. Store and syntax-validate `eventPattern`; do not build the matcher.**
`subscriptions` only validates that a pattern is the literal `*` or dot-separated lowercase-alphanumeric segments with an optional trailing `.*`, and stores it. The function that evaluates "does event X match pattern Y" has no caller in this change — the routing consumer in `event-ingestion-kafka-pipeline` is the only thing that will ever call it, and per the same reasoning `project-and-api-key-minimal` applied to the API-key validation guard, code with no caller doesn't get built yet.
*Note:* an earlier exploration pass discussed *how* the matcher would work (simple segment matching, not full glob) in anticipation of needing it now. Writing the spec surfaced that this change has no actual caller for it at all — the segment-matching *algorithm* choice still stands, but its implementation is deferred wholesale to `event-ingestion-kafka-pipeline`, alongside the pattern-shape validation rule this change encodes so garbage never gets past the door it does own.

**4. Endpoint and subscription deletion cascade, matching the `api_keys` precedent.**
`endpoints.project_id` and `subscriptions.endpoint_id` both get `ON DELETE CASCADE` foreign keys (added by hand to the generated migration, same as `api_keys.project_id` — TypeORM doesn't emit a relation-level FK without a `@ManyToOne`/`@JoinColumn`, which this codebase deliberately avoids in favor of plain FK columns). Deleting a project therefore cascades through its endpoints to their subscriptions in one operation.

**5. Endpoint state is `enabled: boolean` + `disabledAt: timestamp | null`, per §14's literal field list.**
No separate state enum — `enabled=true` is ACTIVE, `enabled=false` is DISABLED (§16), and `disabledAt` is set on disable, cleared on enable.

## Risks / Trade-offs

- **[Literal blocklist is trivially bypassable via DNS]** → Mitigation: deliberate and disclosed — it stops the zero-effort cases (typing `localhost` or the AWS metadata IP directly) without pretending to be `ssrf-and-redirect-protection`, which still must ship before any endpoint is actually dialed by `event-ingestion-kafka-pipeline`.
- **[Deferring the wildcard matcher means `event-ingestion-kafka-pipeline` inherits that work]** → Mitigation: that change already owns "identify matching endpoints" per §29; this is not new scope for it, just where the implementation was always going to live.
- **[Cascade-deleting subscriptions/endpoints loses their history]** → Mitigation: same acceptance as `api_keys` — no reader depends on it yet; revisit if/when audit logging (Phase 4) needs it.
