import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../../api/Project';
import { PaginationParams } from '../../../core/types/Pagination';

export function useGetProjects(params: PaginationParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => getProjects(params),
  });
}
