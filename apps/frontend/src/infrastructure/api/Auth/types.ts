export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
}
