import React from 'react';
import { cn } from './cn';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  id?: string;
  className?: string;
}

/** On/off control. On is ink, never red: red is for the primary action. */
export const Switch: React.FC<Props> = ({ checked, onChange, label, id, className }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150',
      checked ? 'bg-text-primary border-text-primary' : 'bg-surface-active border-border-strong',
      className
    )}
    style={{ borderColor: checked ? undefined : 'var(--pp-border-strong)' }}
  >
    <span
      aria-hidden="true"
      className={cn('inline-block h-4.5 w-4.5 rounded-full transition-transform duration-150', checked ? 'translate-x-[22px] bg-surface-card' : 'translate-x-[3px] bg-text-muted')}
      style={{ height: 18, width: 18 }}
    />
  </button>
);
