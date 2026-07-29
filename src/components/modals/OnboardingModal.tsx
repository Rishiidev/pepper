import React, { useState } from 'react';
import { Logo, LogoState } from '../brand/Logo';
import { useSettingsStore } from '../../stores/settings-store';
import { useSessionStore } from '../../stores/session-store';
import {
  Brain,
  Zap,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Key,
  ShieldCheck,
  X,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { updateSettings } = useSettingsStore();
  const { saveWorkspace } = useSessionStore();
  const [step, setStep] = useState<number>(1);
  const [selectedProvider, setSelectedProvider] = useState<string>('none');
  const [isCapturingFirst, setIsCapturingFirst] = useState<boolean>(false);

  if (!isOpen) return null;

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsCapturingFirst(true);
    try {
      await updateSettings({
        hasCompletedOnboarding: true,
        selectedAiProvider: selectedProvider,
      });
      // Capture the user's active window tabs as their very first memory!
      await saveWorkspace('First Memory Capture');
    } catch (err) {
      console.warn('First memory capture skipped:', err);
    } finally {
      setIsCapturingFirst(false);
      onClose();
    }
  };

  const logoStates: Record<number, LogoState> = {
    1: 'normal',
    2: 'saving',
    3: 'restoring',
    4: 'ai',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      {/* Background Portal Glow */}
      <div className="absolute w-96 h-96 bg-pepper-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />

      <div className="relative w-full max-w-xl bg-surface-card border border-border/80 rounded-3xl p-8 shadow-2xl space-y-8 glass-panel animate-portal-expand">
        {/* Top Header & Close */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <Logo size={28} state={logoStates[step]} />
            <div>
              <h2 className="font-extrabold text-sm tracking-widest text-text-primary uppercase font-mono">
                PEPPER OS
              </h2>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">
                Operating System for Human Memory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step Indicators */}
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  onClick={() => setStep(s)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    s === step
                      ? 'w-6 bg-pepper-500'
                      : s < step
                      ? 'w-2 bg-pepper-500/40'
                      : 'w-2 bg-border'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                updateSettings({ hasCompletedOnboarding: true });
                onClose();
              }}
              className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors"
              title="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step 1: The Product Promise */}
        {step === 1 && (
          <div className="space-y-6 text-center py-4 animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-pepper-500/10 border border-pepper-500/20 flex items-center justify-center mx-auto text-pepper-400">
              <Brain className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Computers remember files. Pepper remembers work.
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Leave any workspace instantly. Return as if you never left. No tabs to save, no folders to structure, no rebuilding context.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-left pt-2">
              <div className="p-3 rounded-xl bg-surface border border-border/60 space-y-1">
                <span className="text-[10px] font-bold text-pepper-400 uppercase">Momentum</span>
                <p className="text-[11px] text-text-muted">Zero friction when stopping or resuming tasks.</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border/60 space-y-1">
                <span className="text-[10px] font-bold text-blue-400 uppercase">Memory</span>
                <p className="text-[11px] text-text-muted">Intent and focus recorded automatically.</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border/60 space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Recall</span>
                <p className="text-[11px] text-text-muted">Natural language search across all past work.</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Silent Auto-Capture */}
        {step === 2 && (
          <div className="space-y-6 text-center py-4 animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
              <Zap className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Silent Context Auto-Capture
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Close any browser window at any time. Pepper's background engine automatically captures all open tabs, active tab focus, and domain clusters silently.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-3 text-left">
              <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-400" />
                  <span>Auto-Captured Checkpoint</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  ⚡ Silent Capture
                </span>
              </div>
              <p className="text-xs text-text-muted font-mono">
                Development &amp; Debugging — 6 tabs · 42m active duration
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Work Memory Search (⌘K) */}
        {step === 3 && (
          <div className="space-y-6 text-center py-4 animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
              <Search className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Work Memory Recall (⌘K)
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Press ⌘K anywhere. Type what you remember — "that pricing research" or "Shopify checkout". Pepper reconstructs your exact thinking trail in milliseconds.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-card border border-border/80 relative text-left">
              <div className="flex items-center gap-3 text-xs text-text-primary">
                <Search className="w-4 h-4 text-pepper-400" />
                <span className="font-mono text-text-secondary">competitor pricing models...</span>
                <kbd className="ml-auto text-[9px] font-mono bg-border px-1.5 py-0.5 rounded">⌘K</kbd>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: BYOK & First Capture */}
        {step === 4 && (
          <div className="space-y-6 text-center py-4 animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <Key className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Bring Your Own Keys (BYOK)
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                You own your intelligence. Select your preferred AI provider or start completely offline-first. Pepper never locks you in.
              </p>
            </div>

            {/* Provider Select Grid */}
            <div className="grid grid-cols-2 gap-2 text-left">
              {[
                { id: 'none', label: 'Offline First (Local Default)' },
                { id: 'openai', label: 'OpenAI (GPT-4o)' },
                { id: 'anthropic', label: 'Anthropic (Claude 3.5)' },
                { id: 'gemini', label: 'Google Gemini (1.5 Flash)' },
                { id: 'openrouter', label: 'OpenRouter Gateway' },
                { id: 'ollama', label: 'Ollama (Local LLM)' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all text-left flex items-center justify-between ${
                    selectedProvider === p.id
                      ? 'bg-pepper-500/10 border-pepper-500 text-pepper-400'
                      : 'bg-surface border-border/60 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span>{p.label}</span>
                  {selectedProvider === p.id && <CheckCircle2 className="w-4 h-4 text-pepper-500" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <span className="text-[11px] text-text-muted font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Local First &bull; Zero Tracking</span>
          </span>

          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary rounded-xl transition-colors"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={isCapturingFirst}
              className="flex items-center gap-2 px-6 py-2.5 bg-pepper-500 hover:bg-pepper-600 font-bold text-xs text-white rounded-xl transition-all shadow-lg shadow-pepper-500/20 active:scale-[0.98]"
            >
              <span>
                {isCapturingFirst
                  ? 'Capturing First Memory…'
                  : step === totalSteps
                  ? "Start Reconstructing Work (I'm Back)"
                  : 'Continue'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
