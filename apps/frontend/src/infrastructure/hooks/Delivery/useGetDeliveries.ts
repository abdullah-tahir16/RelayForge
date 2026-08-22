import { useQuery } from '@tanstack/react-query';
import { getDeliveries } from '../../api/Delivery';
import { GetDeliveriesRequest } from '../../api/Delivery/types';
import { deliveryPollingInterval } from '../polling';

export function useGetDeliveries(
  projectId: string,
  params: GetDeliveriesRequest,
  pollWhileNonTerminal = false,
) {
  return useQuery({
    queryKey: ['deliveries', projectId, params],
    queryFn: () => getDeliveries(projectId, params),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      if (!pollWhileNonTerminal) return false;
      return deliveryPollingInterval(query.state.data?.items);
    },
    refetchIntervalInBackground: false,
  });
}
