import { useQuery } from '@tanstack/react-query';
import { getEvent } from '../../api/Event';

export function useGetEvent(eventId: string) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEvent(eventId),
    enabled: Boolean(eventId),
  });
}
