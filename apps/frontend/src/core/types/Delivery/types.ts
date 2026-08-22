export type DeliveryStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'RETRYING'
  | 'SUCCEEDED'
  | 'FAILED';

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
  completedAt: string | null;
  failedAt: string | null;
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

export interface DeliveryFilters {
  status?: DeliveryStatus;
  endpointId?: string;
  eventId?: string;
  httpStatusCode?: number;
  createdFrom?: string;
  createdTo?: string;
}
