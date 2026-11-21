import { use } from 'react';

import { ToastContext } from './toastContext';
import type { ToastContextValue } from './toastContext';

export function useToast(): ToastContextValue {
  const value = use(ToastContext);
  if (!value) throw new Error('useToast must be used inside <ToastProvider>.');
  return value;
}
