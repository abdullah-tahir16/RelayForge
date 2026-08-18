import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enableEndpoint } from '../../api/Endpoint';

export function useEnableEndpoint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (endpointId: string) => enableEndpoint(endpointId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', projectId] });
    },
  });
}
