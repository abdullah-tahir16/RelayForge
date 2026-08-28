## Why

RelayForge reserves `POST /api/v1/endpoints/:id/test` in `documentation.md`, but users still cannot verify a newly configured endpoint until a real application event happens to hit it. Now that the platform has signing, retries, attempt history, and replay, the next gap is a first-class test send that exercises the real delivery path before production traffic depends on it.

## What Changes

- Add a workspace-scoped endpoint action, `POST /api/v1/endpoints/:id/test`, that starts one asynchronous test delivery for exactly that endpoint using its current URL, timeout, enabled state, and signing secret.
- Model the test send as a first-class RelayForge delivery so it uses the existing Kafka-backed publish, delivery, retry, attempt-history, signature, and dead-letter/replay pipeline.
- Persist a synthetic test Event and its Delivery/Run/Attempt history, marked clearly as a test so the dashboard can distinguish it from customer-originated events.
- Add dashboard affordances on the endpoint detail flow to trigger a test delivery, show immediate start/failure feedback, and inspect the resulting delivery history.
- Keep the scope to a single built-in sample payload and one targeted endpoint. Custom payload editors, testing multiple endpoints at once, and project-wide synthetic event tooling remain out of scope.

## Capabilities

### New Capabilities
- `endpoint-test-delivery`: authenticated endpoint-scoped test delivery initiation, synthetic test-event modeling, reuse of the normal delivery pipeline, and dashboard affordances for triggering and inspecting test sends.

### Modified Capabilities
(none)

## Impact

- Backend/API: new endpoint test command/controller surface, authorization through endpoint ownership, synthetic event creation, targeted delivery publication, and response DTOs.
- Delivery pipeline: a publishing path that can deliver to one chosen endpoint without consulting subscriptions while still reusing run creation, signing, retries, dead-lettering, and replay-safe history.
- Data model/query surface: persisted markers that distinguish test traffic from customer traffic while keeping test deliveries inspectable through existing event/delivery history APIs.
- Frontend: endpoint detail action, mutation/hooks/types, and UI cues for test traffic visibility and outcome inspection.
- Tests/docs: backend E2E coverage, worker/integration coverage where needed, and documentation for the synthetic event shape and operator expectations.
