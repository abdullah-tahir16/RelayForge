export type DeliveryStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

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
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryFilters {
  status?: DeliveryStatus;
  endpointId?: string;
  eventId?: string;
  httpStatusCode?: number;
  createdFrom?: string;
  createdTo?: string;
}
