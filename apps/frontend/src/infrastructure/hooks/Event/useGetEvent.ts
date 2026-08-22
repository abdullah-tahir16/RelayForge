import { useQuery } from '@tanstack/react-query';
import { getEvent } from '../../api/Event';

export function useGetEvent(eventId: string) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEvent(eventId),
    enabled: Boolean(eventId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return !status || ['ACCEPTED', 'PUBLISHED', 'PROCESSING'].includes(status)
        ? 2_000
        : false;
    },
    refetchIntervalInBackground: false,
  });
}
