import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppWindow, CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { sessionEngine } from '../../core/engines/session-engine';
import { restoreEngine } from '../../core/engines/restore-engine';
import { DEMO_URLS, findDemoCapture } from '../../core/engines/demo-match';
import { PepperSession } from '../../core/types/session';
import { InlineRename } from '../feedback/InlineRename';

type Phase = 'idle' | 'open' | 'saving' | 'captured' | 'restored' | 'failed';

const POLL_MS = 500;
const CAPTURE_TIMEOUT_MS = 12_000;

interface Props {
  /** Reports whether the user has completed the demo, so the parent can adapt its button. */
  onProgress?: (phase: Phase) => void;
}

/** Guided live demo: open 3 tabs, close the window, watch Pepper save it, restore it. */
export const OnboardingDemo: React.FC<Props> = ({ onProgress }) => {
  const hasExtensionApis = typeof chrome !== 'undefined' && !!chrome.windows?.create;
  const [phase, setPhase] = useState<Phase>('idle');
  const [capture, setCapture] = useState<PepperSession | null>(null);
  const [busy, setBusy] = useState(false);
  const windowId = useRef<number | null>(null);
  const startedAt = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const update = useCallback(
    (next: Phase) => {
      setPhase(next);
      onProgress?.(next);
    },
    [onProgress]
  );

  const stopPolling = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = null;
  };

  const waitForCapture = useCallback(() => {
    stopPolling();
    const deadline = Date.now() + CAPTURE_TIMEOUT_MS;
    pollTimer.current = setInterval(async () => {
      const found = findDemoCapture(await sessionEngine.getAllSessions(), startedAt.current);
      if (found) {
        stopPolling();
        setCapture(found);
        update('captured');
      } else if (Date.now() > deadline) {
        stopPolling();
        update('failed');
      }
    }, POLL_MS);
  }, [update]);

  // Detect the demo window being closed by the user (or by the button below)
  useEffect(() => {
    if (!hasExtensionApis) return;
    const onRemoved = (id: number) => {
      if (id === windowId.current) {
        windowId.current = null;
        update('saving');
        waitForCapture();
      }
    };
    chrome.windows.onRemoved.addListener(onRemoved);
    return () => {
      chrome.windows.onRemoved.removeListener(onRemoved);
      stopPolling();
    };
  }, [hasExtensionApis, update, waitForCapture]);

  const openDemo = async () => {
    setBusy(true);
    try {
      startedAt.current = Date.now();
      // Unique query so a repeat run is not skipped as "already saved"
      const urls = DEMO_URLS.map((u) => `${u}?pepper_demo=${startedAt.current}`);
      const win = await chrome.windows.create({ url: urls, type: 'normal', focused: true });
      windowId.current = win.id ?? null;
      update('open');
    } catch {
      update('failed');
    } finally {
      setBusy(false);
    }
  };

  const closeDemoForMe = async () => {
    if (windowId.current === null) return;
    setBusy(true);
    try {
      await chrome.windows.remove(windowId.current);
    } catch {
      update('failed');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!capture) return;
    setBusy(true);
    try {
      await restoreEngine.restoreSession(capture.id);
      update('restored');
    } catch {
      update('failed');
    } finally {
      setBusy(false);
    }
  };

  if (!hasExtensionApis) {
    return (
      <p className="text-xs text-text-secondary text-center">
        The live demo runs inside the Pepper extension. Install it in Chrome to try it.
      </p>
    );
  }

  const stepClass = (active: boolean, done: boolean) =>
    `flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs ${
      done ? 'border-emerald-500/40 bg-emerald-500/5' : active ? 'border-pepper-500/60 bg-pepper-500/5' : 'border-border bg-surface'
    }`;

  const opened = phase !== 'idle';
  const closed = ['saving', 'captured', 'restored'].includes(phase);
  const saved = ['captured', 'restored'].includes(phase);

  return (
    <div className="space-y-3">
      <ol className="space-y-2 text-left" aria-label="Demo steps">
        <li className={stepClass(phase === 'idle', opened)}>
          <AppWindow className="w-4 h-4 text-pepper-400 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            <strong className="block text-text-primary">1. Open 3 tabs</strong>
            <span className="text-text-muted">We open a new window with three pages about coffee.</span>
          </span>
          {phase === 'idle' && (
            <button
              type="button"
              onClick={openDemo}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-pepper-500 hover:bg-pepper-600 text-white font-bold disabled:opacity-50"
            >
              Open demo window
            </button>
          )}
          {opened && <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-label="Done" />}
        </li>

        <li className={stepClass(phase === 'open', closed)}>
          <XCircle className="w-4 h-4 text-pepper-400 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            <strong className="block text-text-primary">2. Close that window</strong>
            <span className="text-text-muted">Close it yourself, or let us. Pepper saves it with no clicks.</span>
          </span>
          {phase === 'open' && (
            <button
              type="button"
              onClick={closeDemoForMe}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover font-semibold text-text-primary disabled:opacity-50"
            >
              Close it for me
            </button>
          )}
          {phase === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-pepper-400" aria-label="Saving" />}
          {saved && <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-label="Done" />}
        </li>

        <li className={stepClass(phase === 'captured', phase === 'restored')}>
          <RotateCcw className="w-4 h-4 text-pepper-400 shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0">
            <strong className="block text-text-primary">3. Restore it</strong>
            {capture ? (
              <span className="text-text-muted flex items-center gap-1 min-w-0">
                Saved {capture.tabCount} tabs as
                <InlineRename
                  value={capture.name}
                  label="Rename demo workspace"
                  className="text-xs text-pepper-400 min-w-0"
                  onSave={async (name) => setCapture(await sessionEngine.updateSession(capture.id, { name }))}
                />
              </span>
            ) : (
              <span className="text-text-muted">Bring the exact tabs back in one click.</span>
            )}
          </span>
          {phase === 'captured' && (
            <button
              type="button"
              onClick={restore}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-pepper-500 hover:bg-pepper-600 text-white font-bold disabled:opacity-50"
            >
              Restore it
            </button>
          )}
          {phase === 'restored' && <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-label="Done" />}
        </li>
      </ol>

      <div role="status" aria-live="polite" className="min-h-[1.25rem] text-center text-xs">
        {phase === 'saving' && <span className="text-text-secondary">Pepper is saving your window…</span>}
        {phase === 'restored' && (
          <span className="text-emerald-500 font-semibold">
            That is Pepper. Your window is back, and the memory stays in your dashboard.
          </span>
        )}
        {phase === 'failed' && (
          <span className="text-red-500">
            Pepper did not capture the demo window.{' '}
            <button
              type="button"
              className="underline font-semibold"
              onClick={() => {
                setCapture(null);
                update('idle');
              }}
            >
              Try again
            </button>{' '}
            or skip this step.
          </span>
        )}
      </div>
    </div>
  );
};
