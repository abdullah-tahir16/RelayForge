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

export interface DeliveryRequestedMessageV3
  extends DeliveryRequestedMessageBase {
  version: 3;
  jobId: string;
  projectId: string;
  runId: string;
  runNumber: number;
  attemptNumber: number;
  runAttemptNumber: number;
  scheduledAt: string;
}

export interface DeliveryRequestedMessageV4
  extends DeliveryRequestedMessageBase {
  version: 4;
  jobId: string;
  projectId: string;
  runId: string;
  runNumber: number;
  attemptNumber: number;
  runAttemptNumber: number;
  scheduledAt: string;
  endpointSigningSecretEncrypted: string;
  endpointSigningSecretVersion: number;
}

export type DeliveryRequestedMessage =
  | DeliveryRequestedMessageV1
  | DeliveryRequestedMessageV2
  | DeliveryRequestedMessageV3
  | DeliveryRequestedMessageV4;

export interface NormalizedDeliveryRequestedMessage
  extends DeliveryRequestedMessageBase {
  version: 2 | 3 | 4;
  sourceVersion: 1 | 2 | 3 | 4;
  jobId: string;
  projectId?: string;
  runId?: string;
  runNumber?: number;
  attemptNumber: number;
  runAttemptNumber?: number;
  scheduledAt: string;
  endpointSigningSecretEncrypted?: string;
  endpointSigningSecretVersion?: number;
}

/** A run UUID is globally unique, so it is sufficient to namespace every job in that run. */
export function deliveryJobId(
  runId: string,
  runAttemptNumber: number,
): string {
  return `${runId}:${runAttemptNumber}`;
}

/** Retained v1 jobs are always the initial attempt. */
export function normalizeDeliveryRequestedMessage(
  message: DeliveryRequestedMessage,
): NormalizedDeliveryRequestedMessage {
  if (message.version === 4) {
    return { ...message, sourceVersion: 4 };
  }
  if (message.version === 3) {
    return { ...message, sourceVersion: 3 };
  }
  if (message.version === 2) {
    return { ...message, sourceVersion: 2 };
  }
  return {
    ...message,
    version: 2,
    sourceVersion: 1,
    jobId: `${message.deliveryId}:1`,
    attemptNumber: 1,
    scheduledAt: message.eventCreatedAt,
  };
}
