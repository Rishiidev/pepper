import React, { useEffect } from 'react';
import { useToastStore, ToastItem } from './toast-store';

const One: React.FC<{ t: ToastItem }> = ({ t }) => {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(t.id), t.duration);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, dismiss]);

  return (
    <div className="flex items-center gap-3 rounded-full bg-zone-ink text-zone-ink-fg border border-zone-ink-edge pl-5 pr-2 py-2 shadow-lg animate-slide-up">
      <p className="text-sm font-medium">{t.message}</p>
      {t.actionLabel && (
        <button
          type="button"
          onClick={async () => {
            dismiss(t.id);
            await t.onAction?.();
          }}
          className="h-8 rounded-full px-3.5 text-xs font-bold bg-zone-ink-fg text-zone-ink hover:opacity-90"
        >
          {t.actionLabel}
        </button>
      )}
      <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="w-8 h-8 rounded-full text-sm opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>
  );
};

/** Mount once per page. Announces messages politely to screen readers. */
export const ToastHost: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 max-w-[92vw]">
      {toasts.map((t) => (
        <One key={t.id} t={t} />
      ))}
    </div>
  );
};
