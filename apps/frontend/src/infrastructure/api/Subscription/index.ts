import { apiClient } from '../client';
import { Subscription } from '../../../core/types/Subscription';
import {
  GetSubscriptionsRequest,
  GetSubscriptionsResponse,
  SubscribeRequest,
} from './types';

export async function getSubscriptions(
  endpointId: string,
  params: GetSubscriptionsRequest,
): Promise<GetSubscriptionsResponse> {
  const response = await apiClient.get<GetSubscriptionsResponse>(
    `/api/v1/endpoints/${endpointId}/subscriptions`,
    { params },
  );
  return response.data;
}

export async function subscribe(
  endpointId: string,
  request: SubscribeRequest,
): Promise<Subscription> {
  const response = await apiClient.post<Subscription>(
    `/api/v1/endpoints/${endpointId}/subscriptions`,
    request,
  );
  return response.data;
}

export async function unsubscribe(subscriptionId: string): Promise<void> {
  await apiClient.delete(`/api/v1/subscriptions/${subscriptionId}`);
}
