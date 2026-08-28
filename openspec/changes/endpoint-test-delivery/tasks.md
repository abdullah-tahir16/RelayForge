## 1. Backend Data And Contracts

- [x] 1.1 Add the Event test-traffic marker needed to identify endpoint-test Events in API responses and dashboard state.
- [x] 1.2 Add any required migration/backfill behavior so existing Events remain customer-originated by default.
- [x] 1.3 Define the reserved `relayforge.endpoint.test` payload builder and ensure it never includes secrets, API keys, signing ciphertext, or arbitrary user input.
- [x] 1.4 Add response DTOs/types for endpoint-test start results containing Event, Delivery, and initial run identifiers.

## 2. Backend Test Delivery Command

- [x] 2.1 Add a CQRS command and handler for authenticated endpoint test delivery initiation.
- [x] 2.2 Authorize the command through Endpoint -> Project -> Workspace ownership and return not-found semantics across workspace boundaries.
- [x] 2.3 Reject disabled Endpoints with a conflict before creating any Event, Delivery, run, attempt, or delivery job.
- [x] 2.4 Persist one synthetic Event, one targeted Delivery, and one initial Delivery Run for the selected Endpoint in a single transaction.
- [x] 2.5 Publish the first delivery job directly for the targeted Endpoint using its current URL, timeout, signing secret snapshot, and run identity.
- [x] 2.6 Surface publication failure as a retryable API error while preserving the persisted test lifecycle for inspection.
- [x] 2.7 Add `POST /api/v1/endpoints/:id/test` to the endpoints controller with `202 Accepted` success semantics.

## 3. Query And History Visibility

- [x] 3.1 Expose test markers on Event list/detail responses used by the dashboard.
- [x] 3.2 Ensure Delivery, run, attempt, and DLQ views remain workspace-scoped and can inspect test-delivery lifecycles.
- [x] 3.3 Add or adjust filtering/presentation fields so customer-originated Events are not marked as endpoint tests.

## 4. Frontend Endpoint Test Flow

- [x] 4.1 Add frontend API types, mutation function, and React Query hook for starting an endpoint test delivery.
- [x] 4.2 Add an endpoint detail test action with pending, success, conflict, and error feedback.
- [x] 4.3 Link or navigate from a successful test-start result to the created Event/Delivery inspection flow.
- [x] 4.4 Display a clear test marker anywhere synthetic Events appear in event/detail history.
- [x] 4.5 Refresh affected endpoint, event, delivery, run, attempt, and DLQ query data after starting a test.

## 5. Verification

- [x] 5.1 Add backend unit tests for payload construction, disabled endpoint conflict, workspace isolation, and publication failure behavior.
- [x] 5.2 Add backend E2E coverage for successful `POST /api/v1/endpoints/:id/test` creation and response semantics.
- [x] 5.3 Add delivery-worker or pipeline integration coverage showing test jobs use normal signing, attempt recording, retry, and DLQ behavior.
- [x] 5.4 Add frontend tests for endpoint detail test controls, API errors, success navigation, and test markers in history.
- [x] 5.5 Run backend tests, frontend tests, and any targeted worker tests touched by the change.

## 6. Documentation And Roadmap

- [x] 6.1 Document the synthetic endpoint-test event type and payload shape.
- [x] 6.2 Update dashboard/operator context for how endpoint tests appear in history and DLQ views.
- [x] 6.3 Move the roadmap entry through Proposed/Doing/Done according to task progress while preserving the remaining Phase 3 dependency order.
