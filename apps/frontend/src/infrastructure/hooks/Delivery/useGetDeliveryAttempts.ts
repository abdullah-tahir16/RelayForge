import { useQuery } from '@tanstack/react-query';
import { getDeliveryAttempts } from '../../api/Delivery';

export function useGetDeliveryAttempts(deliveryId: string, poll: boolean) {
  return useQuery({
    queryKey: ['delivery-attempts', deliveryId],
    queryFn: () => getDeliveryAttempts(deliveryId),
    enabled: Boolean(deliveryId),
    refetchInterval: poll ? 2_000 : false,
    refetchIntervalInBackground: false,
  });
}
