import { useQuery } from '@tanstack/react-query';
import { getEndpointsLookup } from '../../api/Endpoint';

export function useGetEndpointsLookup(projectId: string) {
  return useQuery({
    queryKey: ['endpoints', projectId, 'lookup'],
    queryFn: () => getEndpointsLookup(projectId),
    enabled: Boolean(projectId),
  });
}
