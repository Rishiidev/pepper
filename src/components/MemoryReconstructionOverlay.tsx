import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Logo } from './brand/Logo';
import { PepperSession } from '../core/types/session';
import { restoreEngine } from '../core/engines/restore-engine';
import { Card } from './ui/Card';
import { FaviconStack } from './ui/FaviconStack';

interface Props {
  memory: PepperSession;
  onComplete: () => void;
  onCancel?: () => void;
}

/**
 * The restore moment: the one place Pepper gets to feel like something.
 * A short, calm portal, then "You're back." Reduced-motion users get a fade.
 */
export const MemoryReconstructionOverlay: React.FC<Props> = ({ memory, onComplete, onCancel }) => {
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        await restoreEngine.restoreSession(memory.id);
      } catch (err) {
        console.error('Failed to restore workspace:', err);
      }
      if (cancelled) return;
      setDone(true);
      setTimeout(onComplete, 600);
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [memory.id, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 animate-fade-in" role="dialog" aria-modal="true" aria-label="Restoring workspace">
      <Card tone="ink" className="w-full max-w-sm text-center space-y-5 animate-portal-expand">
        <div className="flex justify-center">
          <Logo size={48} state="normal" />
        </div>
        <div className="space-y-1" role="status" aria-live="polite">
          <h2 className="text-[28px] font-bold leading-tight">{done ? "You're back." : 'Restoring…'}</h2>
          <p className="text-sm opacity-80">
            {memory.tabCount} tab{memory.tabCount !== 1 ? 's' : ''} from <strong>{memory.name}</strong>
          </p>
        </div>
        <div className="flex justify-center">
          <FaviconStack items={memory.tabs} max={6} size={32} ring="var(--pp-ink-bg)" total={memory.tabCount} />
        </div>
        {done ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Restored
          </p>
        ) : (
          onCancel && (
            <button type="button" onClick={onCancel} className="text-sm underline opacity-80 hover:opacity-100">
              Cancel
            </button>
          )
        )}
      </Card>
    </div>
  );
};
