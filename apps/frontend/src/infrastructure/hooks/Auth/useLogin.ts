import { useMutation } from '@tanstack/react-query';
import { login } from '../../api/Auth';
import { LoginRequest } from '../../api/Auth/types';

export function useLogin() {
  return useMutation({
    mutationFn: (request: LoginRequest) => login(request),
  });
}
