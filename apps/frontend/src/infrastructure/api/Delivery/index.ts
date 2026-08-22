import { apiClient } from '../client';
import { GetDeliveriesRequest, GetDeliveriesResponse } from './types';
import { DeliveryAttempt } from '../../../core/types/Delivery';

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

export async function getDeliveryAttempts(
  deliveryId: string,
): Promise<DeliveryAttempt[]> {
  const response = await apiClient.get<DeliveryAttempt[]>(
    `/api/v1/deliveries/${deliveryId}/attempts`,
  );
  return response.data;
}
