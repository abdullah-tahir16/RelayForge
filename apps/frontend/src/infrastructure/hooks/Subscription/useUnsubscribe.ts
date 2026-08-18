import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unsubscribe } from '../../api/Subscription';

export function useUnsubscribe(endpointId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) => unsubscribe(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['subscriptions', endpointId],
      });
    },
  });
}
