import { useQuery } from '@tanstack/react-query';
import { getProjectSummary } from '../../api/DashboardSummary';

export function useGetProjectSummary(projectId: string) {
  return useQuery({
    queryKey: ['project-summary', projectId],
    queryFn: () => getProjectSummary(projectId),
    enabled: Boolean(projectId),
  });
}
