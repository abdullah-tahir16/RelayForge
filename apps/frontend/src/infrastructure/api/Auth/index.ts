import { apiClient } from '../client';
import { AuthTokensResponse, LoginRequest } from './types';

export async function login(
  request: LoginRequest,
): Promise<AuthTokensResponse> {
  const response = await apiClient.post<AuthTokensResponse>(
    '/api/v1/auth/login',
    request,
  );
  return response.data;
}
