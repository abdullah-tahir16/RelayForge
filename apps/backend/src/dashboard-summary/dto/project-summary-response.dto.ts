export interface RecentActivityItemDto {
  eventId: string;
  eventType: string;
  status: string;
  isTest: boolean;
  createdAt: Date;
}

export interface EndpointSummaryDto {
  enabled: number;
  disabled: number;
}

export class ProjectSummaryResponseDto {
  inFlightCount: number;
  needsAttentionCount: number;
  dlqBacklogCount: number;
  endpoints: EndpointSummaryDto;
  recentActivity: RecentActivityItemDto[];
}
