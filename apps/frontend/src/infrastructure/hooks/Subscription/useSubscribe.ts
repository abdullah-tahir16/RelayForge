import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subscribe } from '../../api/Subscription';

export function useSubscribe(endpointId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventPattern: string) =>
      subscribe(endpointId, { eventPattern }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['subscriptions', endpointId],
      });
    },
  });
}
