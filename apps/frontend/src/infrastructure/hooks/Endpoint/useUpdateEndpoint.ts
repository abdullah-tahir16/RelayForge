import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEndpoint } from '../../api/Endpoint';
import { EndpointFormValues } from '../../../core/types/Endpoint';

export function useUpdateEndpoint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      endpointId,
      values,
    }: {
      endpointId: string;
      values: EndpointFormValues;
    }) => updateEndpoint(endpointId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', projectId] });
    },
  });
}
