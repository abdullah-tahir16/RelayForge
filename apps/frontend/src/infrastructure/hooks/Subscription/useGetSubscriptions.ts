import { useQuery } from '@tanstack/react-query';
import { getSubscriptions } from '../../api/Subscription';
import { PaginationParams } from '../../../core/types/Pagination';

export function useGetSubscriptions(
  endpointId: string,
  params: PaginationParams,
) {
  return useQuery({
    queryKey: ['subscriptions', endpointId, params],
    queryFn: () => getSubscriptions(endpointId, params),
    enabled: Boolean(endpointId),
  });
}
