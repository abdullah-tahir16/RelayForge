## Context

See `proposal.md` for motivation. The current system already has authenticated endpoint management, endpoint signing secrets, async delivery jobs, delivery runs, immutable attempts, retry topics, DLQ publication, replay, and dashboard inspection. `POST /api/v1/endpoints/:id/test` is reserved in the source documentation but not implemented.

Main specs do not exist under `openspec/specs/` yet because prior changes remain unarchived, so this change adds a new capability delta and intentionally references behavior established by the completed changes.

## Goals / Non-Goals

**Goals:**
- Let an authenticated dashboard user verify a single Endpoint through the same worker path used by normal deliveries.
- Persist test traffic in the existing Event/Delivery/Run/Attempt model with an explicit marker.
- Keep delivery semantics consistent with signing, retries, DLQ, and replay.
- Add a small endpoint detail UI flow for starting and inspecting a test.

**Non-Goals:**
- No custom test payload editor.
- No multi-endpoint or project-wide test event generator.
- No synchronous "ping this URL and return its HTTP response" path.
- No changes to subscription matching behavior.

## Decisions

### 1. Test delivery is first-class asynchronous traffic

`POST /api/v1/endpoints/:id/test` creates a synthetic Event, one targeted Delivery, and the initial Delivery Run, then publishes a normal delivery job and returns `202 Accepted`.

This exercises the actual production delivery path, including signing, timeout handling, retries, diagnostics redaction, and DLQ behavior. It also gives the user inspectable history instead of an ephemeral probe result.

Alternative considered: a synchronous backend HTTP request to the endpoint. Rejected because it would duplicate worker behavior, skip retry/DLQ/signing semantics, require separate diagnostics handling, and make the test less representative of real deliveries.

### 2. Target the selected endpoint directly

The backend should not publish a normal event-routing message and rely on subscriptions for endpoint tests. The test action already names the target Endpoint, so it should create exactly one Delivery for that Endpoint and publish the delivery job directly.

This avoids surprising behavior where an endpoint test is dropped because no subscription matches or fan-outs to other endpoints in the same project. It also keeps the endpoint detail action local to the resource the user is inspecting.

Alternative considered: create a normal Event with event type `relayforge.endpoint.test` and let the routing consumer find matching subscriptions. Rejected because users are testing endpoint reachability/configuration, not subscription routing.

### 3. Mark synthetic Events with metadata, not a parallel table

Use the existing Event table and add a small durable marker that query DTOs can expose, such as metadata containing `source: "ENDPOINT_TEST"` and the target `endpointId`. If the current DTO shape makes metadata awkward to query safely, add explicit lightweight columns for `source` and target endpoint identity rather than a separate endpoint-test table.

Keeping the record in Events preserves the current dashboard and API mental model: tests appear in history, have deliveries, have attempts, and can be inspected like other traffic. A separate table would force duplicate UI and authorization paths.

Alternative considered: a dedicated `endpoint_test_deliveries` table. Rejected unless implementation uncovers a strong indexing or migration reason, because the existing Event/Delivery graph already represents the lifecycle.

### 4. Use one reserved event type and built-in payload

The test Event uses `relayforge.endpoint.test` and a stable built-in JSON payload that identifies RelayForge, the Endpoint, and the test timestamp. The payload should not include secrets, API keys, signing material, or user-provided arbitrary data.

This keeps the first feature narrow and makes receiver-side filtering straightforward. Custom payloads can be added later without changing the core lifecycle model.

Alternative considered: accepting arbitrary JSON in the test request body. Deferred because it adds validation, UX, and support surface without being necessary to prove endpoint delivery.

### 5. Disabled endpoints conflict

A disabled Endpoint should return conflict from the test action and create no persisted lifecycle. The existing system treats disabled endpoints as unable to receive new matching events and manual replays; endpoint tests should not create a special exception.

Alternative considered: allow tests while disabled so users can verify before re-enabling. Rejected for now because it weakens the meaning of disabled and creates a delivery path that bypasses an explicit operator control.

## Risks / Trade-offs

- **[Test traffic pollutes event history]** -> Mitigation: expose an explicit test marker in Event/Delivery responses and visual treatment in the dashboard so users can scan or filter it later.
- **[Direct publication drifts from routing behavior]** -> Mitigation: keep direct publication limited to endpoint tests and reuse the same delivery-job contract consumed by the worker.
- **[Publication can fail after persistence]** -> Mitigation: report a retryable error and leave the persisted lifecycle inspectable; repeated test clicks start independent test lifecycles instead of mutating old ones.
- **[A disabled endpoint cannot be preflighted before enablement]** -> Mitigation: make the conflict explicit in API/UI copy; users can enable, test, then disable again if needed.

## Migration Plan

1. Add any Event marker fields or metadata mapping needed for test visibility.
2. Add the endpoint test backend command and API response.
3. Reuse current delivery-job publication and worker behavior for processing.
4. Expose test markers and detail links in existing query DTOs.
5. Add the endpoint detail UI action and refresh behavior.
6. Deploy backend/worker-compatible changes before the UI button is released.

Rollback is straightforward if no schema field is required. If a marker column is added, rollback can leave the column unused until a later cleanup migration.
