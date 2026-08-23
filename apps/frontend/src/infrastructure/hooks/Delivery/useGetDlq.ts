import { useQuery } from '@tanstack/react-query';
import { getDlq } from '../../api/Delivery';
import { GetDlqRequest } from '../../api/Delivery/types';
import { visibleDlqPollingInterval } from '../polling';

export function useGetDlq(projectId: string, params: GetDlqRequest) {
  return useQuery({
    queryKey: ['dlq', projectId, params],
    queryFn: () => getDlq(projectId, params),
    enabled: Boolean(projectId),
    refetchInterval: () => visibleDlqPollingInterval(),
    refetchIntervalInBackground: false,
  });
}
