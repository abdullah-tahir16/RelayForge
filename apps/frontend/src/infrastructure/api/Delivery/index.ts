import { apiClient } from '../client';
import {
  GetDeliveriesRequest,
  GetDeliveriesResponse,
  GetDlqRequest,
  GetDlqResponse,
} from './types';
import {
  DeliveryAttempt,
  DeliveryRun,
  ReplayDeliveryResult,
  ReplayEventResult,
} from '../../../core/types/Delivery';

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

export async function getDlq(
  projectId: string,
  params: GetDlqRequest,
): Promise<GetDlqResponse> {
  const response = await apiClient.get<GetDlqResponse>(
    `/api/v1/projects/${projectId}/dlq`,
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

export async function getDeliveryRuns(
  deliveryId: string,
): Promise<DeliveryRun[]> {
  const response = await apiClient.get<DeliveryRun[]>(
    `/api/v1/deliveries/${deliveryId}/runs`,
  );
  return response.data;
}

export async function replayDelivery(
  deliveryId: string,
): Promise<ReplayDeliveryResult> {
  const response = await apiClient.post<ReplayDeliveryResult>(
    `/api/v1/deliveries/${deliveryId}/replay`,
  );
  return response.data;
}

export async function replayEvent(eventId: string): Promise<ReplayEventResult> {
  const response = await apiClient.post<ReplayEventResult>(
    `/api/v1/events/${eventId}/replay`,
  );
  return response.data;
}
