import { apiClient } from '../client';
import { ProjectSummary } from '../../../core/types/DashboardSummary';

export async function getProjectSummary(
  projectId: string,
): Promise<ProjectSummary> {
  const response = await apiClient.get<ProjectSummary>(
    `/api/v1/projects/${projectId}/summary`,
  );
  return response.data;
}
