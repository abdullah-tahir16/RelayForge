import { useToastContext } from './ToastProvider';

export function useToast() {
  const { showToast } = useToastContext();
  return {
    success: (message: string) => showToast(message, 'success'),
    error: (message: string) => showToast(message, 'error'),
  };
}
