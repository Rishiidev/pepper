import { useEffect, useState } from 'react';

const TABS = [
  { name: 'Webhooks guide', color: '#4C6EF5', letter: 'D' },
  { name: 'Verify signatures', color: '#12B886', letter: 'C' },
  { name: 'Testing locally', color: '#4C6EF5', letter: 'D' },
];

const STEPS = [
  { title: 'Open your work', body: 'Three tabs, one window. Nothing to set up.' },
  { title: 'Close the window', body: 'Pepper saves it the moment it closes. No clicks.' },
  { title: 'Bring it back', body: 'One click and every tab is exactly where you left it.' },
];

/** A looping picture of the product's promise. Still and fully described for screen readers and reduced motion. */
export function DemoLoop() {
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    if (mq.matches) return;
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 2600);
    return () => clearInterval(t);
  }, []);

  const shown = reduced ? 2 : step;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] items-center">
      <ol className="space-y-3" aria-label="How it works">
        {STEPS.map((s, i) => (
          <li key={s.title} className={`card p-5 flex gap-4 transition-shadow ${i === shown ? 'ring-2 ring-ink' : ''}`} aria-current={i === shown ? 'step' : undefined}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-canvas font-bold" aria-hidden="true">{i + 1}</span>
            <div>
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="text-ink-2">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="card p-6 min-h-[300px] relative overflow-hidden" aria-hidden="true">
        <p className="eyebrow text-muted mb-4">{shown === 0 ? 'Your browser' : shown === 1 ? 'Window closed' : 'Your workspaces'}</p>
        <div className="space-y-3 rounded-2xl bg-canvas p-4" style={{ opacity: shown === 1 ? 0.25 : 1, transform: shown === 1 ? 'scale(.96)' : 'none', transition: 'all .4s' }}>
          <div className="flex gap-2">
            {TABS.map((t) => (
              <span key={t.name} className="inline-flex items-center gap-2 rounded-full bg-card border border-line px-3 py-1.5 text-sm font-semibold">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: t.color }}>{t.letter}</span>
                <span className="hidden sm:inline">{t.name}</span>
              </span>
            ))}
          </div>
          <div className="h-16 rounded-xl bg-card border border-line" />
        </div>

        <div className="mt-4 rounded-2xl bg-zmint text-zmint-fg p-4 flex items-center justify-between gap-3" style={{ opacity: shown >= 1 ? 1 : 0, transform: shown >= 1 ? 'none' : 'translateY(10px)', transition: 'all .4s' }}>
          <div>
            <p className="eyebrow opacity-75">Saved</p>
            <p className="font-bold">Webhooks · 3 tabs</p>
          </div>
          <span className={`rounded-full px-4 py-2 text-sm font-bold ${shown === 2 ? 'bg-red text-white' : 'border border-current/40'}`}>Restore</span>
        </div>
      </div>
    </div>
  );
}
