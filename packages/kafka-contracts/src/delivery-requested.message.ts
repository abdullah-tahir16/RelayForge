/**
 * Published to `relayforge.deliveries` by the routing consumer, once per
 * matched endpoint. Carries everything the delivery consumer needs so it
 * never has to read the `endpoints`, `subscriptions`, or `events` tables
 * (design.md Decision 3).
 */
export interface DeliveryRequestedMessage {
  version: 1;
  deliveryId: string;
  eventId: string;
  endpointId: string;
  eventType: string;
  eventCreatedAt: string;
  data: Record<string, unknown>;
  endpointUrl: string;
  endpointTimeoutMs: number;
}
