import { useNavigate } from 'react-router-dom';
import { useGetProjectSummary } from '../../../infrastructure/hooks/DashboardSummary/useGetProjectSummary';
import { useProjectUseCase } from '../../../infrastructure/useCases/Project/useProjectUseCase';
import { RecentActivityItem } from '../../../core/types/DashboardSummary';

export function useOverviewFeature() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectUseCase();
  const projectId = selectedProjectId ?? '';
  const summaryQuery = useGetProjectSummary(projectId);
  const summary = summaryQuery.data;

  function onActivityClick(item: RecentActivityItem): void {
    navigate(`/events/${item.eventId}`);
  }

  return {
    isLoading: summaryQuery.isLoading,
    isError: summaryQuery.isError,
    inFlightCount: summary?.inFlightCount ?? 0,
    needsAttentionCount: summary?.needsAttentionCount ?? 0,
    dlqBacklogCount: summary?.dlqBacklogCount ?? 0,
    endpoints: summary?.endpoints ?? { enabled: 0, disabled: 0 },
    recentActivity: summary?.recentActivity ?? [],
    onActivityClick,
  };
}
