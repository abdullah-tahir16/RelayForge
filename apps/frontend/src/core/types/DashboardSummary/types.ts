import { EventStatus } from '../Event';

export interface RecentActivityItem {
  eventId: string;
  eventType: string;
  status: EventStatus;
  isTest: boolean;
  createdAt: string;
}

export interface EndpointSummary {
  enabled: number;
  disabled: number;
}

export interface ProjectSummary {
  inFlightCount: number;
  needsAttentionCount: number;
  dlqBacklogCount: number;
  endpoints: EndpointSummary;
  recentActivity: RecentActivityItem[];
}
