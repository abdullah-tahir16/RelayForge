import axios from 'axios';
import { clearSession, getStoredSession, storeSession } from './session';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});

apiClient.interceptors.request.use((config) => {
  const session = getStoredSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const session = getStoredSession();
  if (!session?.refreshToken) {
    return null;
  }
  try {
    const response = await axios.post(
      `${apiClient.defaults.baseURL}/api/v1/auth/refresh`,
      { refreshToken: session.refreshToken },
    );
    const nextSession = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
    storeSession(nextSession);
    return nextSession.accessToken;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config.__isRetry) {
      return Promise.reject(error);
    }

    refreshPromise ??= refreshAccessToken();
    const accessToken = await refreshPromise;
    refreshPromise = null;

    if (!accessToken) {
      clearSession();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    config.__isRetry = true;
    config.headers.Authorization = `Bearer ${accessToken}`;
    return apiClient(config);
  },
);
