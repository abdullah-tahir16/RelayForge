import { useQuery } from '@tanstack/react-query';
import { getEndpoints } from '../../api/Endpoint';
import { PaginationParams } from '../../../core/types/Pagination';

export function useGetEndpoints(projectId: string, params: PaginationParams) {
  return useQuery({
    queryKey: ['endpoints', projectId, params],
    queryFn: () => getEndpoints(projectId, params),
    enabled: Boolean(projectId),
  });
}
