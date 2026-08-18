import { useQuery } from '@tanstack/react-query';
import { getEvents } from '../../api/Event';
import { GetEventsRequest } from '../../api/Event/types';

export function useGetEvents(projectId: string, params: GetEventsRequest) {
  return useQuery({
    queryKey: ['events', projectId, params],
    queryFn: () => getEvents(projectId, params),
    enabled: Boolean(projectId),
  });
}
