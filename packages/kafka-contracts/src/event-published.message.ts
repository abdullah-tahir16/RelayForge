/**
 * Published to `relayforge.events` after an event is durably persisted.
 * Deliberately minimal (§26) — the routing consumer re-reads the full
 * Event row from Postgres by `eventId` rather than trusting this payload.
 */
export interface EventPublishedMessage {
  version: 1;
  eventId: string;
  projectId: string;
  eventType: string;
  createdAt: string;
}
