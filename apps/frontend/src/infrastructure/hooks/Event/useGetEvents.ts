import { useQuery } from '@tanstack/react-query';
import { getEvents } from '../../api/Event';
import { GetEventsRequest } from '../../api/Event/types';
import { eventListPollingInterval } from '../polling';

export function useGetEvents(
  projectId: string,
  params: GetEventsRequest,
  pollWhileNonTerminal = false,
) {
  return useQuery({
    queryKey: ['events', projectId, params],
    queryFn: () => getEvents(projectId, params),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      if (!pollWhileNonTerminal) return false;
      return eventListPollingInterval(query.state.data?.items);
    },
    refetchIntervalInBackground: false,
  });
}
