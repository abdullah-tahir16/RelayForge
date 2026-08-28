export type EventStatus =
  | 'ACCEPTED'
  | 'PUBLISHED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIALLY_FAILED'
  | 'FAILED';

export interface EventListItem {
  id: string;
  event: string;
  status: EventStatus;
  createdAt: string;
  deliveryTotal: number;
  deliverySucceeded: number;
  isTest: boolean;
  testTargetEndpointId: string | null;
}

export interface EventDetail {
  id: string;
  event: string;
  status: EventStatus;
  createdAt: string;
  publishedAt: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  isTest: boolean;
  testTargetEndpointId: string | null;
}

export interface EventFilters {
  eventType?: string;
  status?: EventStatus;
  createdFrom?: string;
  createdTo?: string;
  endpointId?: string;
}
