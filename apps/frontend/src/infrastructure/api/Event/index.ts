import { apiClient } from '../client';
import { EventDetail } from '../../../core/types/Event';
import { GetEventsRequest, GetEventsResponse } from './types';

export async function getEvents(
  projectId: string,
  params: GetEventsRequest,
): Promise<GetEventsResponse> {
  const response = await apiClient.get<GetEventsResponse>(
    `/api/v1/projects/${projectId}/events`,
    { params },
  );
  return response.data;
}

export async function getEvent(eventId: string): Promise<EventDetail> {
  const response = await apiClient.get<EventDetail>(
    `/api/v1/events/${eventId}`,
  );
  return response.data;
}
