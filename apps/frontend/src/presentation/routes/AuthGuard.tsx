import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthUseCase } from '../../infrastructure/useCases/Auth/useAuthUseCase';

export interface AuthGuardProps {
  children: ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated } = useAuthUseCase();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
