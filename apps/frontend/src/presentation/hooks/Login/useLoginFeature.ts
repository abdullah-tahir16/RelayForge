import { useNavigate } from 'react-router-dom';
import { useAuthUseCase } from '../../../infrastructure/useCases/Auth/useAuthUseCase';
import { LoginFormValues } from '../../components/Login/data';

export function useLoginFeature() {
  const navigate = useNavigate();
  const { login, isLoggingIn, loginError } = useAuthUseCase();

  async function handleSubmit(values: LoginFormValues): Promise<void> {
    try {
      await login(values.email, values.password);
      navigate('/events');
    } catch {
      // loginError from useAuthUseCase already reflects the failure.
    }
  }

  return {
    handleSubmit,
    isSubmitting: isLoggingIn,
    errorMessage: loginError ? 'Invalid email or password' : undefined,
  };
}
