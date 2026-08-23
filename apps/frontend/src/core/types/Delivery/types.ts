export type DeliveryStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'RETRYING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'DEAD_LETTERED';

export type DeliveryRunTrigger = 'INITIAL' | 'MANUAL';

export const NON_TERMINAL_DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  'PENDING',
  'PROCESSING',
  'RETRYING',
];

export interface Delivery {
  id: string;
  eventId: string;
  endpointId: string;
  status: DeliveryStatus;
  attemptCount: number;
  currentRunId: string;
  completedAt: string | null;
  failedAt: string | null;
  deadLetteredAt: string | null;
  httpStatusCode: number | null;
  durationMs: number | null;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAttempt {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  runId: string;
  runNumber: number;
  runTrigger: DeliveryRunTrigger;
  runAttemptNumber: number;
  requestHeaders: Record<string, string> | null;
  responseStatus: number | null;
  responseHeaders: Record<string, string> | null;
  responseBodyPreview: string | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface DeliveryRunActor {
  id: string;
  email: string;
}

export interface DeliveryRun {
  id: string;
  deliveryId: string;
  runNumber: number;
  trigger: DeliveryRunTrigger;
  requestedBy: DeliveryRunActor | null;
  status: DeliveryStatus;
  attemptLimit: number | null;
  attemptCount: number;
  initialJobPublishedAt: string | null;
  dlqPublishedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  deadLetteredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DlqItem {
  deliveryId: string;
  eventId: string;
  eventType: string;
  endpointId: string;
  endpointName: string;
  endpointEnabled: boolean;
  runId: string;
  runNumber: number;
  failureReason: string;
  httpStatusCode: number | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
  deadLetteredAt: string;
}

export interface ReplayDeliveryResult {
  deliveryId: string;
  runId: string;
  runNumber: number;
  status: 'started' | 'resumed';
}

export interface ReplayEventSkippedResult {
  deliveryId: string;
  reason: 'endpoint_disabled' | 'active_run' | 'not_eligible';
}

export interface ReplayEventPublicationFailedResult {
  deliveryId: string;
  runId: string;
  runNumber: number;
  reason: 'publication_failed';
}

export interface ReplayEventResult {
  started: ReplayDeliveryResult[];
  resumed: ReplayDeliveryResult[];
  skipped: ReplayEventSkippedResult[];
  publicationFailed: ReplayEventPublicationFailedResult[];
}

export interface DeliveryFilters {
  status?: DeliveryStatus;
  endpointId?: string;
  eventId?: string;
  httpStatusCode?: number;
  createdFrom?: string;
  createdTo?: string;
}
