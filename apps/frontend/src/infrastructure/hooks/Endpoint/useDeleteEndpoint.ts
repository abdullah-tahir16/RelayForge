import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEndpoint } from '../../api/Endpoint';

export function useDeleteEndpoint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (endpointId: string) => deleteEndpoint(endpointId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', projectId] });
    },
  });
}
