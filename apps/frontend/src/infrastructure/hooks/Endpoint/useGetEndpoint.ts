import { useQuery } from '@tanstack/react-query';
import { getEndpoint } from '../../api/Endpoint';

export function useGetEndpoint(endpointId: string) {
  return useQuery({
    queryKey: ['endpoint', endpointId],
    queryFn: () => getEndpoint(endpointId),
    enabled: Boolean(endpointId),
  });
}
