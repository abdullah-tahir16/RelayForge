import { useQuery } from '@tanstack/react-query';
import { getDeliveryRuns } from '../../api/Delivery';
import { runHistoryPollingInterval } from '../polling';

export function useGetDeliveryRuns(deliveryId: string, poll: boolean) {
  return useQuery({
    queryKey: ['delivery-runs', deliveryId],
    queryFn: () => getDeliveryRuns(deliveryId),
    enabled: Boolean(deliveryId),
    refetchInterval: (query) =>
      runHistoryPollingInterval(query.state.data, poll),
    refetchIntervalInBackground: false,
  });
}
