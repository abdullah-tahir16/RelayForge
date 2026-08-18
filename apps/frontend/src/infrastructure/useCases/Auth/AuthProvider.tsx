import { createContext, ReactNode, useContext, useState } from 'react';
import { Session } from '../../../core/types/Auth';
import { getStoredSession } from '../../api/session';

interface AuthContextValue {
  session: Session | null;
  setSession: (session: Session | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(getStoredSession());

  return (
    <AuthContext.Provider value={{ session, setSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;
