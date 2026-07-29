import React, { useEffect, useState } from 'react';
import { Logo } from './brand/Logo';
import { PepperSession } from '../core/types/session';
import { restoreEngine } from '../core/engines/restore-engine';
import { Sparkles, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Props {
  memory: PepperSession;
  onComplete: () => void;
  onCancel?: () => void;
}

/**
 * MemoryReconstructionOverlay
 *
 * Implements the core emotional goal of PEPPER: "I'm Back."
 * Instead of generic loading spinners, this component reconstructs
 * the user's unfinished thinking with an expanding geometric portal animation.
 */
export const MemoryReconstructionOverlay: React.FC<Props> = ({ memory, onComplete, onCancel }) => {
  const [phase, setPhase] = useState<'expanding' | 'rebuilding' | 'ready'>('expanding');

  useEffect(() => {
    // Stage 1: Portal Expansion
    const t1 = setTimeout(() => setPhase('rebuilding'), 400);

    // Stage 2: Tab & Context Re-hydration
    const t2 = setTimeout(async () => {
      setPhase('ready');
      try {
        await restoreEngine.restoreSession(memory.id);
      } catch (err) {
        console.error('Failed to reconstruct memory:', err);
      }
      setTimeout(onComplete, 500);
    }, 1100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [memory.id, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl text-text-primary p-6 animate-fade-in select-none">
      {/* Background Portal Glow */}
      <div className="absolute w-96 h-96 bg-pepper-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />

      <div className="relative flex flex-col items-center text-center space-y-6 max-w-md w-full animate-portal-expand">
        {/* Animated Geometric P Logo System */}
        <Logo size={64} state="restoring" />

        {/* Dynamic Status Messaging */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 px-3 py-1 rounded-full bg-pepper-500/10 border border-pepper-500/20 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Context Reconstruction</span>
          </span>

          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {phase === 'ready' ? "I'm Back." : 'Rebuilding Momentum…'}
          </h2>

          <p className="text-xs text-text-secondary font-medium leading-relaxed">
            Re-hydrating {memory.tabCount} browser tabs for <span className="text-text-primary font-bold">{memory.name}</span>
          </p>
        </div>

        {/* Tab Cards Rebuilding Stream */}
        <div className="w-full bg-surface-card border border-border/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted pb-1 border-b border-border/40">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-pepper-500" />
              <span>Memory Tabs ({memory.tabs.length})</span>
            </span>
            <span className="text-emerald-400 font-mono flex items-center gap-1">
              {phase === 'ready' && <CheckCircle2 className="w-3 h-3" />}
              {phase === 'ready' ? 'Restored' : 'Re-hydrating...'}
            </span>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-hidden text-left">
            {memory.tabs.slice(0, 4).map((tab, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface border border-border/50 text-xs text-text-secondary animate-slide-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <img
                  src={tab.favIconUrl || '/icons/icon-16.png'}
                  alt=""
                  className="w-3.5 h-3.5 rounded object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/icons/icon-16.png'; }}
                />
                <span className="truncate text-text-primary font-medium text-[11px]">{tab.title || tab.url}</span>
              </div>
            ))}
            {memory.tabs.length > 4 && (
              <div className="text-[10px] text-center text-text-muted font-mono pt-1">
                + {memory.tabs.length - 4} more tabs re-hydrated
              </div>
            )}
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-text-muted hover:text-text-primary transition-colors underline pt-2"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
