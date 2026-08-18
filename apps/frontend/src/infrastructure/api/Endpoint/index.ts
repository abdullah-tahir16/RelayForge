import { apiClient } from '../client';
import { Endpoint } from '../../../core/types/Endpoint';
import {
  CreateEndpointRequest,
  GetEndpointsLookupResponse,
  GetEndpointsRequest,
  GetEndpointsResponse,
  UpdateEndpointRequest,
} from './types';

export async function getEndpoints(
  projectId: string,
  params: GetEndpointsRequest,
): Promise<GetEndpointsResponse> {
  const response = await apiClient.get<GetEndpointsResponse>(
    `/api/v1/projects/${projectId}/endpoints`,
    { params },
  );
  return response.data;
}

export async function getEndpoint(endpointId: string): Promise<Endpoint> {
  const response = await apiClient.get<Endpoint>(
    `/api/v1/endpoints/${endpointId}`,
  );
  return response.data;
}

export async function getEndpointsLookup(
  projectId: string,
): Promise<GetEndpointsLookupResponse> {
  const response = await apiClient.get<GetEndpointsLookupResponse>(
    `/api/v1/projects/${projectId}/endpoints/lookup`,
  );
  return response.data;
}

export async function createEndpoint(
  projectId: string,
  request: CreateEndpointRequest,
): Promise<Endpoint> {
  const response = await apiClient.post<Endpoint>(
    `/api/v1/projects/${projectId}/endpoints`,
    request,
  );
  return response.data;
}

export async function updateEndpoint(
  endpointId: string,
  request: UpdateEndpointRequest,
): Promise<Endpoint> {
  const response = await apiClient.patch<Endpoint>(
    `/api/v1/endpoints/${endpointId}`,
    request,
  );
  return response.data;
}

export async function enableEndpoint(endpointId: string): Promise<Endpoint> {
  const response = await apiClient.post<Endpoint>(
    `/api/v1/endpoints/${endpointId}/enable`,
  );
  return response.data;
}

export async function disableEndpoint(endpointId: string): Promise<Endpoint> {
  const response = await apiClient.post<Endpoint>(
    `/api/v1/endpoints/${endpointId}/disable`,
  );
  return response.data;
}

export async function deleteEndpoint(endpointId: string): Promise<void> {
  await apiClient.delete(`/api/v1/endpoints/${endpointId}`);
}
