import { createContext } from 'react';

export type ToastTone = 'success' | 'error';

export interface ToastMessage {
  message: string;
  tone: ToastTone;
}

export interface ToastContextValue {
  showToast: (toast: ToastMessage) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
