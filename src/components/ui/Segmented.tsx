import React from 'react';
import { cn } from './cn';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}

/** Radio-style toggle group with arrow-key support. */
export function Segmented<T extends string>({ options, value, onChange, label, className }: Props<T>) {
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length;
    onChange(options[next].value);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex max-w-full flex-wrap gap-1 rounded-[20px] border border-border bg-surface-card p-1', className)}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors duration-150',
              selected ? 'bg-text-primary text-surface-card' : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
