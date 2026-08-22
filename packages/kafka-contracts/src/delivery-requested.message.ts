/**
 * Published to `relayforge.deliveries` by the routing consumer, once per
 * matched endpoint. Carries everything the delivery consumer needs so it
 * never has to read the `endpoints`, `subscriptions`, or `events` tables
 * (design.md Decision 3).
 */
interface DeliveryRequestedMessageBase {
  deliveryId: string;
  eventId: string;
  endpointId: string;
  eventType: string;
  eventCreatedAt: string;
  data: Record<string, unknown>;
  endpointUrl: string;
  endpointTimeoutMs: number;
}

export interface DeliveryRequestedMessageV1
  extends DeliveryRequestedMessageBase {
  version: 1;
}

export interface DeliveryRequestedMessageV2
  extends DeliveryRequestedMessageBase {
  version: 2;
  jobId: string;
  projectId: string;
  attemptNumber: number;
  scheduledAt: string;
}

export type DeliveryRequestedMessage =
  | DeliveryRequestedMessageV1
  | DeliveryRequestedMessageV2;

export interface NormalizedDeliveryRequestedMessage
  extends DeliveryRequestedMessageBase {
  version: 2;
  jobId: string;
  projectId?: string;
  attemptNumber: number;
  scheduledAt: string;
}

/** Retained v1 jobs are always the initial attempt. */
export function normalizeDeliveryRequestedMessage(
  message: DeliveryRequestedMessage,
): NormalizedDeliveryRequestedMessage {
  if (message.version === 2) {
    return message;
  }
  return {
    ...message,
    version: 2,
    jobId: `${message.deliveryId}:1`,
    attemptNumber: 1,
    scheduledAt: message.eventCreatedAt,
  };
}
