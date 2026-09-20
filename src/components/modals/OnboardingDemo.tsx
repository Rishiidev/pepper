import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { sessionEngine } from '../../core/engines/session-engine';
import { restoreEngine } from '../../core/engines/restore-engine';
import { DEMO_URLS, findDemoCapture } from '../../core/engines/demo-match';
import { PepperSession } from '../../core/types/session';
import { InlineRename } from '../feedback/InlineRename';
import { Button } from '../ui/Button';

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
    return <p className="text-sm text-text-secondary">The live demo runs inside the Pepper extension. Install it in Chrome to try it.</p>;
  }

  const opened = phase !== 'idle';
  const closed = ['saving', 'captured', 'restored'].includes(phase);
  const saved = ['captured', 'restored'].includes(phase);

  const Row: React.FC<{ n: number; title: string; body: React.ReactNode; active: boolean; done: boolean; action?: React.ReactNode }> = ({ n, title, body, active, done, action }) => (
    <li className={`flex items-center gap-4 rounded-inner border px-4 py-3 ${done ? 'bg-zone-mint text-zone-mint-fg border-zone-mint-edge' : active ? 'bg-surface-card border-border-strong' : 'bg-surface-active border-transparent opacity-80'}`} style={active && !done ? { borderColor: 'var(--pp-text)' } : undefined}>
      <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-zone-mint-fg text-zone-mint' : 'bg-text-primary text-surface-card'}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm">{title}</strong>
        <span className="block text-sm opacity-80">{body}</span>
      </span>
      {action}
    </li>
  );

  return (
    <div className="space-y-3">
      <ol className="space-y-2" aria-label="Demo steps">
        <Row
          n={1}
          title="Open 3 tabs"
          body="We open a new window with three pages about coffee."
          active={phase === 'idle'}
          done={opened}
          action={
            phase === 'idle' && (
              <Button variant="primary" onClick={openDemo} disabled={busy}>
                Open demo window
              </Button>
            )
          }
        />
        <Row
          n={2}
          title="Close that window"
          body="Close it yourself, or let us. Pepper saves it with no clicks."
          active={phase === 'open'}
          done={closed}
          action={
            <>
              {phase === 'open' && (
                <Button onClick={closeDemoForMe} disabled={busy}>
                  Close it for me
                </Button>
              )}
              {phase === 'saving' && <Loader2 className="w-4 h-4 animate-spin" aria-label="Saving" />}
            </>
          }
        />
        <Row
          n={3}
          title="Restore it"
          done={phase === 'restored'}
          active={phase === 'captured'}
          body={
            capture ? (
              <span className="flex items-center gap-1 min-w-0">
                Saved {capture.tabCount} tabs as
                <InlineRename value={capture.name} label="Rename demo workspace" className="text-sm min-w-0" onSave={async (name) => setCapture(await sessionEngine.updateSession(capture.id, { name }))} />
              </span>
            ) : (
              'Bring the exact tabs back in one click.'
            )
          }
          action={
            phase === 'captured' && (
              <Button variant="primary" onClick={restore} disabled={busy}>
                Restore it
              </Button>
            )
          }
        />
      </ol>

      <div role="status" aria-live="polite" className="min-h-6 text-sm">
        {phase === 'saving' && <span className="text-text-secondary">Pepper is saving your window…</span>}
        {phase === 'restored' && <span className="font-semibold">That’s Pepper. Your window is back, and the workspace stays in your dashboard.</span>}
        {phase === 'failed' && (
          <span className="text-pepper-400">
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
