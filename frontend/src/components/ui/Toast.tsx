import { CircleCheck, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { ToastContext } from './toastContext';
import type { ToastMessage, ToastTone } from './toastContext';

/** Errors stay longer: they ask the hiker to do something. */
const VISIBLE_MS: Record<ToastTone, number> = { success: 2400, error: 4000 };

interface ActiveToast extends ToastMessage {
  id: number;
}

/** Provides `showToast` and renders one short-lived, politely announced message at a time. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((message: ToastMessage) => {
    nextId.current += 1;
    setToast({ ...message, id: nextId.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, VISIBLE_MS[toast.tone]);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const Icon = toast?.tone === 'error' ? TriangleAlert : CircleCheck;

  return (
    <ToastContext value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[72px] z-50 flex justify-center px-4"
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              className="material flex items-center gap-2 rounded-full border-[0.5px] border-separator px-4 py-2 text-callout shadow-panel"
            >
              <Icon
                aria-hidden
                className={
                  toast.tone === 'error' ? 'size-4 text-caution-text' : 'size-4 text-go-text'
                }
              />
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}
