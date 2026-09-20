import React from 'react';
import { cn } from './cn';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  id?: string;
  className?: string;
  /** Use on the dark hero card, where the default ink track would disappear */
  onInk?: boolean;
}

/** On/off control. On is ink, never red: red is for the primary action. */
export const Switch: React.FC<Props> = ({ checked, onChange, label, id, className, onInk }) => {
  const track = onInk
    ? checked
      ? { background: 'var(--pp-ink-fg)', borderColor: 'var(--pp-ink-fg)' }
      : { background: 'transparent', borderColor: 'var(--pp-ink-fg)' }
    : checked
      ? { background: 'var(--pp-text)', borderColor: 'var(--pp-text)' }
      : { background: 'var(--pp-card-active)', borderColor: 'var(--pp-border-strong)' };
  const knob = onInk ? (checked ? 'var(--pp-ink-bg)' : 'var(--pp-ink-fg)') : checked ? 'var(--pp-card)' : 'var(--pp-text-muted)';
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={track}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150', className)}
    >
      <span
        aria-hidden="true"
        className="inline-block rounded-full transition-transform duration-150"
        style={{ height: 18, width: 18, background: knob, transform: `translateX(${checked ? 22 : 3}px)` }}
      />
    </button>
  );
};
