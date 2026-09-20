import React from 'react';
import { cn } from './cn';

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'mint' | 'lilac' | 'butter';
}

const TONES = {
  neutral: 'bg-surface-active text-text-secondary',
  mint: 'bg-zone-mint text-zone-mint-fg',
  lilac: 'bg-zone-lilac text-zone-lilac-fg',
  butter: 'bg-zone-butter text-zone-butter-fg',
};

export const Chip: React.FC<ChipProps> = ({ tone = 'neutral', className, ...rest }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', TONES[tone], className)} {...rest} />
);

export const Kbd: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className, ...rest }) => (
  <kbd
    className={cn('inline-flex items-center rounded-md border border-current/25 px-1.5 py-0.5 text-xs font-mono font-semibold opacity-80', className)}
    {...rest}
  />
);
