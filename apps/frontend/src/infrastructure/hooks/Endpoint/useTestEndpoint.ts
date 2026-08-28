import { useMutation, useQueryClient } from '@tanstack/react-query';
import { testEndpoint } from '../../api/Endpoint';

export function useTestEndpoint(projectId: string, endpointId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => testEndpoint(endpointId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['endpoint', endpointId] });
      queryClient.invalidateQueries({ queryKey: ['endpoints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['events', projectId] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', projectId] });
      queryClient.invalidateQueries({ queryKey: ['delivery', result.deliveryId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-runs', result.deliveryId] });
      queryClient.invalidateQueries({
        queryKey: ['delivery-attempts', result.deliveryId],
      });
      queryClient.invalidateQueries({ queryKey: ['dlq', projectId] });
    },
  });
}
