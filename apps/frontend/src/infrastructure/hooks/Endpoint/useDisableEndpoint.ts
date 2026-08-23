import { useMutation, useQueryClient } from '@tanstack/react-query';
import { disableEndpoint } from '../../api/Endpoint';

export function useDisableEndpoint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (endpointId: string) => disableEndpoint(endpointId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dlq', projectId] });
    },
  });
}
