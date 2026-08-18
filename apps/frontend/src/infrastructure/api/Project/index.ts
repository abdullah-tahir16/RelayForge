import { apiClient } from '../client';
import { GetProjectsRequest, GetProjectsResponse } from './types';

export async function getProjects(
  params: GetProjectsRequest,
): Promise<GetProjectsResponse> {
  const response = await apiClient.get<GetProjectsResponse>('/api/v1/projects', {
    params,
  });
  return response.data;
}
