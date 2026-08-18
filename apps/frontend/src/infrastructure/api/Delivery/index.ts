import { apiClient } from '../client';
import { GetDeliveriesRequest, GetDeliveriesResponse } from './types';

export async function getDeliveries(
  projectId: string,
  params: GetDeliveriesRequest,
): Promise<GetDeliveriesResponse> {
  const response = await apiClient.get<GetDeliveriesResponse>(
    `/api/v1/projects/${projectId}/deliveries`,
    { params },
  );
  return response.data;
}
