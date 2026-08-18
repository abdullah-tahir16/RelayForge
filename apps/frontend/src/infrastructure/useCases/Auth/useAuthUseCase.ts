import { useLogin } from '../../hooks/Auth/useLogin';
import { clearSession, storeSession } from '../../api/session';
import { useAuthContext } from './AuthProvider';

export function useAuthUseCase() {
  const { session, setSession } = useAuthContext();
  const loginMutation = useLogin();

  async function login(email: string, password: string): Promise<void> {
    const tokens = await loginMutation.mutateAsync({ email, password });
    storeSession(tokens);
    setSession(tokens);
  }

  function logout(): void {
    clearSession();
    setSession(null);
  }

  return {
    session,
    isAuthenticated: Boolean(session),
    login,
    logout,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
  };
}
