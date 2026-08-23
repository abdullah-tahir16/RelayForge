## Purpose

Provides an auditable recovery path for exhausted webhook deliveries through durable dead-letter publication, explicit delivery runs, and safe workspace-scoped manual replay.

## ADDED Requirements

### Requirement: Exhausted delivery runs become dead-lettered
The system SHALL mark a delivery run exhausted only after its final allowed attempt fails. A newly exhausted run SHALL become terminal, its logical Delivery SHALL become `DEAD_LETTERED` with no next-attempt time, and the system SHALL publish a versioned notification to `relayforge.dlq` using a stable dead-letter identity. The notification SHALL contain identifiers and a safe failure summary but SHALL NOT contain event payloads, webhook request or response bodies, credentials, or unredacted headers.

#### Scenario: Final attempt fails
- **WHEN** the final allowed attempt in a delivery run fails
- **THEN** the run and Delivery become `DEAD_LETTERED`, the Event is aggregated using that terminal failure, and one logical dead-letter notification becomes publishable

#### Scenario: Dead-letter publication fails
- **WHEN** the run is durably exhausted but publishing its dead-letter notification fails
- **THEN** the source delivery job is not acknowledged as complete and later processing retries publication without repeating the completed webhook attempt

#### Scenario: Dead-letter notification is published more than once
- **WHEN** a crash or offset redelivery causes the same exhausted run to be published to the DLQ more than once
- **THEN** every notification carries the same stable dead-letter identity and the database retains one exhausted run without duplicating attempts

#### Scenario: Historical failed delivery predates DLQ support
- **WHEN** an existing terminal `FAILED` delivery is migrated into the run model
- **THEN** its historical outcome remains terminal and replay-eligible without retroactively publishing a dead-letter notification

### Requirement: Every delivery lifecycle is represented by an immutable run
The system SHALL represent the initial delivery lifecycle and every manual replay as a distinct, ordered Delivery Run beneath the same logical Delivery. A run SHALL record its run number, trigger, requesting user when manual, snapshotted attempt limit, status, attempt count, publication state, and lifecycle timestamps. Existing Delivery Attempt history SHALL remain immutable and SHALL identify both a globally monotonic delivery attempt number and a run-relative attempt number.

#### Scenario: New delivery starts its initial run
- **WHEN** routing creates a new Delivery
- **THEN** the system creates run 1 with an initial trigger and uses it for the first bounded attempt lifecycle

#### Scenario: Manual replay starts another run
- **WHEN** an eligible terminal Delivery is replayed
- **THEN** the system creates the next run under that same Delivery with a fresh configured attempt budget and preserves every earlier run and attempt unchanged

#### Scenario: Attempts span multiple runs
- **WHEN** a five-attempt initial run is followed by a replay run
- **THEN** replay attempts use run-relative numbers beginning at 1 while their delivery-wide attempt numbers continue after the original five

#### Scenario: User inspects replay lineage
- **WHEN** an authorized user inspects a Delivery's run and attempt history
- **THEN** the system presents runs chronologically with their trigger, actor when available, status, counters, timestamps, and associated attempts without altering prior outcomes

### Requirement: Users can list their project's current dead-letter queue
The system SHALL expose a paginated `GET /api/v1/projects/:projectId/dlq` query scoped to the authenticated user's workspace. Results SHALL contain only Deliveries whose latest run is currently `DEAD_LETTERED`, ordered by most recent dead-letter time, and SHALL include the event, endpoint, safe failure reason, completed-attempt count, last-attempt time, and creation/dead-letter timestamps needed by the dashboard.

#### Scenario: Project has dead-lettered deliveries
- **WHEN** an authorized user lists the DLQ for a project with currently dead-lettered Deliveries
- **THEN** the system returns those Deliveries newest-first with pagination metadata and safe summary fields

#### Scenario: Replay leaves the DLQ
- **WHEN** a new replay run starts for a dead-lettered Delivery
- **THEN** that Delivery no longer appears in the current DLQ query while its historical dead-lettered run remains inspectable

#### Scenario: Replay exhausts again
- **WHEN** a replay run exhausts its fresh attempt budget
- **THEN** the Delivery reappears in the DLQ with the latest run's failure summary and dead-letter time

#### Scenario: User requests another workspace's DLQ
- **WHEN** an authenticated user requests the DLQ for a project outside their workspace
- **THEN** the system rejects the request as if the project does not exist

### Requirement: Users can replay one eligible terminal delivery
The system SHALL expose workspace-scoped `POST /api/v1/deliveries/:deliveryId/replay` for a `SUCCEEDED`, `DEAD_LETTERED`, or legacy terminal `FAILED` Delivery. Replay SHALL keep the same Delivery identity, use the immutable original Event payload and the Endpoint's current enabled configuration, create one new manual run, transition the Delivery and Event to non-terminal processing state, and submit the first job of the new run. Historical runs and attempts SHALL NOT be modified.

#### Scenario: Dead-lettered delivery is replayed
- **WHEN** an authorized user replays a dead-lettered Delivery whose Endpoint is enabled and which has no active run
- **THEN** the system starts exactly one new run with a fresh attempt budget, returns its identity, and eventually processes its first attempt

#### Scenario: Successful delivery is replayed
- **WHEN** an authorized user replays a currently successful Delivery
- **THEN** the same logical Delivery begins a new manual run and its parent Event returns to `PROCESSING` until the replay resolves

#### Scenario: Endpoint configuration was repaired
- **WHEN** a user updates an Endpoint and then replays one of its terminal Deliveries
- **THEN** the replay sends the original Event data to the Endpoint's current URL, timeout, enabled state, and other current delivery configuration

#### Scenario: Endpoint is disabled
- **WHEN** a user requests replay for a Delivery whose Endpoint is disabled
- **THEN** the system returns a conflict and creates no run or delivery job

#### Scenario: Delivery already has active work
- **WHEN** replay is requested while the Delivery's latest run is `PENDING`, `PROCESSING`, or `RETRYING`
- **THEN** the system returns a conflict and does not create a concurrent run

#### Scenario: Replay job publication is retried
- **WHEN** the replay run is persisted but its first delivery job cannot be published
- **THEN** the request reports a retryable failure and a repeated replay request resumes publication for that same unpublished run rather than creating another run

#### Scenario: User replays another workspace's delivery
- **WHEN** an authenticated user requests replay for a Delivery outside their workspace
- **THEN** the system rejects the request as if the Delivery does not exist

### Requirement: Users can replay failed deliveries for one event
The system SHALL expose workspace-scoped `POST /api/v1/events/:eventId/replay` to start new runs for the Event's eligible `DEAD_LETTERED` and legacy terminal `FAILED` Deliveries. The response SHALL identify every started Delivery and every skipped Delivery with a safe reason. Disabled endpoints and Deliveries with active runs SHALL be skipped, successful Deliveries SHALL not be included, and a retried command SHALL NOT create duplicate active runs.

#### Scenario: Event contains multiple failed deliveries
- **WHEN** an authorized user replays an Event with multiple failed or dead-lettered Deliveries whose Endpoints are enabled
- **THEN** the system starts one new run for each eligible Delivery and transitions the Event to `PROCESSING`

#### Scenario: Some failed deliveries cannot start
- **WHEN** an Event replay includes a disabled Endpoint or a Delivery that already has active work
- **THEN** the system starts other eligible runs and reports each skipped Delivery and its reason

#### Scenario: Event has no eligible failed deliveries
- **WHEN** an Event replay request finds no failed or dead-lettered Delivery that can start a run
- **THEN** the system returns a conflict and creates no new run

#### Scenario: User replays another workspace's event
- **WHEN** an authenticated user requests replay for an Event outside their workspace
- **THEN** the system rejects the request as if the Event does not exist

### Requirement: Event aggregation follows the latest delivery run
The system SHALL treat `DEAD_LETTERED` as a terminal failed Delivery outcome and SHALL aggregate each logical Delivery once using its current latest-run summary. Starting any replay run SHALL make the parent Event `PROCESSING`; after all current Delivery runs are terminal, the Event SHALL resolve to `COMPLETED`, `PARTIALLY_FAILED`, or `FAILED` from the latest outcome of each logical Delivery.

#### Scenario: Every delivery is dead-lettered
- **WHEN** every logical Delivery for an Event has a latest run in `DEAD_LETTERED`
- **THEN** the Event becomes terminal `FAILED`

#### Scenario: Replay begins after event failure
- **WHEN** at least one new replay run starts for a previously terminal Event
- **THEN** the Event becomes `PROCESSING` while any replay run is active

#### Scenario: Replay repairs the final failed delivery
- **WHEN** a replay succeeds and every logical Delivery's latest outcome is now successful
- **THEN** the Event becomes `COMPLETED` even though historical runs include failures and dead-letter outcomes

### Requirement: Dashboard supports dead-letter recovery workflows
The dashboard SHALL provide a dedicated Dead Letter Queue destination showing the Event, Endpoint, safe failure reason, attempt count, last-attempt time, and creation/dead-letter time for each current DLQ item. Users SHALL be able to inspect run/attempt history, replay an eligible Delivery, disable its Endpoint through the existing endpoint action, and replay failed Deliveries from an Event view. The UI SHALL report started, skipped, conflict, and publication-failure outcomes and refresh affected data without a full page reload.

#### Scenario: User opens the DLQ screen
- **WHEN** a project with dead-lettered Deliveries is selected
- **THEN** the dashboard shows a paginated newest-first DLQ table with inspect, replay, and disable-endpoint actions

#### Scenario: User replays from the DLQ
- **WHEN** replay successfully starts from a DLQ row
- **THEN** the row leaves the current DLQ view and the Delivery's new run and processing state become inspectable

#### Scenario: Event replay is partially eligible
- **WHEN** an Event replay starts some Deliveries and skips others
- **THEN** the dashboard identifies the started and skipped counts and provides safe reasons for skipped items

#### Scenario: Replay resolves while a view is open
- **WHEN** a replayed Delivery changes from an active state to `SUCCEEDED` or `DEAD_LETTERED`
- **THEN** periodic refresh eventually updates the Delivery, Event, run history, attempt history, and DLQ membership without a page reload
