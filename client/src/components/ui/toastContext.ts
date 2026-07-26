import { createContext, useContext } from 'react';

// Context + hook live apart from the provider component so each file exports one
// kind of thing (keeps React Fast Refresh working per-file).
export type ToastVariant = 'success' | 'error';

export type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
