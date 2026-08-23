import { useMutation, useQueryClient } from '@tanstack/react-query';
import { replayDelivery } from '../../api/Delivery';

export function invalidateDeliveryReplayQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  deliveryId: string,
): void {
  queryClient.invalidateQueries({ queryKey: ['dlq', projectId] });
  queryClient.invalidateQueries({ queryKey: ['deliveries', projectId] });
  queryClient.invalidateQueries({ queryKey: ['delivery-runs', deliveryId] });
  queryClient.invalidateQueries({ queryKey: ['delivery-attempts', deliveryId] });
  queryClient.invalidateQueries({ queryKey: ['events', projectId] });
  queryClient.invalidateQueries({ queryKey: ['event'] });
}

export function useReplayDelivery(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) => replayDelivery(deliveryId),
    onSuccess: (_result, deliveryId) => {
      invalidateDeliveryReplayQueries(queryClient, projectId, deliveryId);
    },
  });
}
