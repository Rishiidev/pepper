import React, { useEffect, useRef, useState } from 'react';
import { Bell, Clock, Cpu } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { useSettingsStore } from '../../stores/settings-store';
import { OnboardingDemo } from './OnboardingDemo';
import { Button, Card, CardHeader, Switch } from '../ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * First run: value before anything else. Screen 1 is the live demo, screen 2 is
 * three optional choices. Nothing here blocks using Pepper.
 */
export const OnboardingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { updateSettings } = useSettingsStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [demoPhase, setDemoPhase] = useState('idle');
  const [timeline, setTimeline] = useState(false);
  const [notify, setNotify] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, [isOpen, step]);

  const finish = async (withChoices: boolean) => {
    await updateSettings({
      hasCompletedOnboarding: true,
      ...(withChoices ? { sessionTrackingEnabled: timeline, notifyOnAutoCapture: notify } : {}),
    });
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && void finish(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-surface animate-fade-in" role="presentation">
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-6 px-5 py-10">
        <header className="flex items-center justify-between">
          <Logo showText size={24} />
          <button type="button" onClick={() => finish(false)} className="text-sm font-semibold text-text-secondary underline underline-offset-2 hover:text-text-primary">
            Skip for now
          </button>
        </header>

        {step === 1 ? (
          <>
            <div className="space-y-2">
              <p className="eyebrow text-text-muted">Step 1 of 2</p>
              <h1 id="onboarding-title" className="text-[28px] font-bold leading-tight">
                Close it. It’s saved.
              </h1>
              <p className="text-base text-text-secondary">Try it now. It takes about ten seconds.</p>
            </div>
            <Card>
              <OnboardingDemo onProgress={setDemoPhase} />
            </Card>
            <div className="flex items-center justify-end gap-2">
              <Button variant={demoPhase === 'restored' ? 'primary' : 'secondary'} onClick={() => setStep(2)} data-autofocus>
                {demoPhase === 'restored' ? 'Continue' : 'Skip the demo'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <p className="eyebrow text-text-muted">Step 2 of 2</p>
              <h1 id="onboarding-title" className="text-[28px] font-bold leading-tight">
                Two optional things
              </h1>
              <p className="text-base text-text-secondary">You can change any of these later in Settings.</p>
            </div>

            <Card tone="lilac" className="space-y-3">
              <CardHeader eyebrow="Timeline" title="Record a private session timeline" icon={<Clock className="w-4 h-4" />} action={<Switch checked={timeline} onChange={setTimeline} label="Record a private session timeline" />} />
              <p className="text-sm">See when you opened Chrome and which tabs you used, and scrub back to any moment. Local only, skips incognito, and you can block sites.</p>
            </Card>
            <Card className="space-y-3">
              <CardHeader eyebrow="Auto-save" title="Tell me when a window is saved" icon={<Bell className="w-4 h-4" />} action={<Switch checked={notify} onChange={setNotify} label="Tell me when a window is saved" />} />
              <p className="text-sm text-text-secondary">A quiet notification with Reopen and Rename.</p>
            </Card>
            <Card className="space-y-2">
              <CardHeader eyebrow="AI" title="Runs without AI" icon={<Cpu className="w-4 h-4" />} />
              <p className="text-sm text-text-secondary">Names and search work on your device. You can add your own AI provider later in Settings.</p>
            </Card>

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => finish(true)} data-autofocus>
                Finish
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
