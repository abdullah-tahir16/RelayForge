import { useQuery } from '@tanstack/react-query';
import { getDeliveries } from '../../api/Delivery';
import { GetDeliveriesRequest } from '../../api/Delivery/types';

export function useGetDeliveries(
  projectId: string,
  params: GetDeliveriesRequest,
) {
  return useQuery({
    queryKey: ['deliveries', projectId, params],
    queryFn: () => getDeliveries(projectId, params),
    enabled: Boolean(projectId),
  });
}
