/**
 * Safe notification emitted after a delivery run exhausts its attempt budget.
 *
 * This deliberately contains no event data, endpoint URL, request/response
 * body, credentials, or headers. PostgreSQL remains the canonical DLQ view.
 */
export interface DeliveryDeadLetteredMessageV1 {
  version: 1;
  deadLetterId: string;
  projectId: string;
  eventId: string;
  deliveryId: string;
  endpointId: string;
  runId: string;
  runNumber: number;
  attemptCount: number;
  finalAttemptNumber: number;
  finalRunAttemptNumber: number;
  failureKind: 'HTTP' | 'NETWORK' | 'TIMEOUT';
  failureReason: string;
  finalHttpStatus: number | null;
  deadLetteredAt: string;
}

export type DeliveryDeadLetteredMessage = DeliveryDeadLetteredMessageV1;

export function deadLetterId(runId: string): string {
  return runId;
}
