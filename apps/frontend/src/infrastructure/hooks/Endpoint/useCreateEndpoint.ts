import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEndpoint } from '../../api/Endpoint';
import { EndpointFormValues } from '../../../core/types/Endpoint';

export function useCreateEndpoint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: EndpointFormValues) =>
      createEndpoint(projectId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', projectId] });
    },
  });
}
