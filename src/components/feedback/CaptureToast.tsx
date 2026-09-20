import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';
import { LAST_CAPTURE_KEY, CaptureAnnouncement, captureMessage } from '../../core/engines/capture-feedback';
import { sessionEngine } from '../../core/engines/session-engine';
import { restoreEngine } from '../../core/engines/restore-engine';
import { InlineRename } from './InlineRename';

const RECENT_MS = 15_000;
const AUTO_HIDE_MS = 12_000;

/**
 * Quiet confirmation that a window was auto-captured, with the name editable in place.
 * Appears live when the dashboard is open, or when opened from the capture notification.
 */
export const CaptureToast: React.FC = () => {
  const [capture, setCapture] = useState<CaptureAnnouncement | null>(null);
  const [name, setName] = useState('');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(async (a: CaptureAnnouncement, force = false) => {
    if (!force && Date.now() - a.at > RECENT_MS) return;
    const session = await sessionEngine.getSessionById(a.sessionId);
    if (!session) return;
    setName(session.name);
    setCapture(a);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCapture(null), AUTO_HIDE_MS);
  }, []);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;

    // Opened from the notification (?capture=<id>)
    const id = new URLSearchParams(window.location.search).get('capture');
    if (id) {
      chrome.storage.local.get(LAST_CAPTURE_KEY).then((res) => {
        const last = res[LAST_CAPTURE_KEY] as CaptureAnnouncement | undefined;
        if (last && last.sessionId === id) void show(last, true);
      });
    }

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      const next = changes[LAST_CAPTURE_KEY]?.newValue as CaptureAnnouncement | undefined;
      if (area === 'local' && next) void show(next);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [show]);

  if (!capture) return null;

  const pauseHide = () => hideTimer.current && clearTimeout(hideTimer.current);

  return (
    <div
      role="status"
      aria-live="polite"
      onFocus={pauseHide}
      onMouseEnter={pauseHide}
      className="fixed bottom-6 right-6 z-50 w-80 bg-surface-card border border-border rounded-2xl shadow-2xl p-4 space-y-2 animate-slide-up"
    >
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-bold text-text-primary">{captureMessage(capture.tabCount, capture.kind)}</p>
          <InlineRename
            value={name}
            label="Rename captured workspace"
            className="w-full text-xs text-text-secondary"
            onSave={async (next) => {
              await sessionEngine.updateSession(capture.sessionId, { name: next });
              setName(next);
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setCapture(null)}
          aria-label="Dismiss notification"
          className="p-1 text-text-muted hover:text-text-primary rounded"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => restoreEngine.restoreSession(capture.sessionId)}
        className="flex items-center gap-1.5 text-xs font-semibold text-pepper-400 hover:underline"
      >
        <RotateCcw className="w-3 h-3" aria-hidden="true" />
        Reopen this window
      </button>
    </div>
  );
};
