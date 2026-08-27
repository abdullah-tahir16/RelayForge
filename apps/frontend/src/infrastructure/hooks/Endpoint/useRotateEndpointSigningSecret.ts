import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rotateEndpointSigningSecret } from '../../api/Endpoint';

export function useRotateEndpointSigningSecret(endpointId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rotateEndpointSigningSecret(endpointId),
    gcTime: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoint', endpointId] });
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });
}
