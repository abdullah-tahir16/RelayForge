import { useMutation, useQueryClient } from '@tanstack/react-query';
import { replayEvent } from '../../api/Delivery';

export function useReplayEvent(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => replayEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlq', projectId] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', projectId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-runs'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['events', projectId] });
      queryClient.invalidateQueries({ queryKey: ['event'] });
    },
  });
}
