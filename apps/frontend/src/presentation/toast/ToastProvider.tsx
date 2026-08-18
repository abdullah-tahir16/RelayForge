import { createContext, ReactNode, useContext, useState } from 'react';
import { AlertColor } from '@mui/material/Alert';
import AppSnackbar from '../components/App/AppSnackbar';

interface ToastState {
  message: string;
  severity: AlertColor;
}

interface ToastContextValue {
  showToast: (message: string, severity: AlertColor) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export interface ToastProviderProps {
  children: ReactNode;
}

const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, severity: AlertColor): void {
    setToast({ message, severity });
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <AppSnackbar
          open
          message={toast.message}
          severity={toast.severity}
          onClose={() => setToast(null)}
        />
      )}
    </ToastContext.Provider>
  );
};

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
