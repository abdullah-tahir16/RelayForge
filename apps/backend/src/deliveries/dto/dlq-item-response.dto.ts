export class DlqItemResponseDto {
  deliveryId: string;
  eventId: string;
  eventType: string;
  isTest: boolean;
  testTargetEndpointId: string | null;
  endpointId: string;
  endpointName: string;
  endpointEnabled: boolean;
  runId: string;
  runNumber: number;
  failureReason: string;
  httpStatusCode: number | null;
  attemptCount: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
  deadLetteredAt: Date;
}
