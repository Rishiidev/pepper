import React from 'react';
import { cn } from './cn';

export type Tone = 'paper' | 'ink' | 'mint' | 'lilac' | 'butter';

const TONES: Record<Tone, string> = {
  paper: 'bg-surface-card text-text-primary border-border shadow-card',
  ink: 'bg-zone-ink text-zone-ink-fg border-zone-ink-edge',
  mint: 'bg-zone-mint text-zone-mint-fg border-zone-mint-edge',
  lilac: 'bg-zone-lilac text-zone-lilac-fg border-zone-lilac-edge',
  butter: 'bg-zone-butter text-zone-butter-fg border-zone-butter-edge',
};

/** CSS color of a tone's surface, for rings around avatars and the like. */
export const TONE_BG: Record<Tone, string> = {
  paper: 'var(--pp-card)',
  ink: 'var(--pp-ink-bg)',
  mint: 'var(--pp-mint-bg)',
  lilac: 'var(--pp-lilac-bg)',
  butter: 'var(--pp-butter-bg)',
};

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  tone?: Tone;
  pad?: 'none' | 'sm' | 'md';
  as?: React.ElementType;
}

export const Card: React.FC<CardProps> = ({ tone = 'paper', pad = 'md', as: Tag = 'div', className, ...rest }) => (
  <Tag
    className={cn(
      'border animate-slide-up',
      // Dashboard cards: 24px padding inside a 24px radius. Compact surfaces (popup, side panel): 20 and 20.
      pad === 'sm' ? 'rounded-[20px]' : 'rounded-card',
      TONES[tone],
      pad === 'md' && 'p-6',
      pad === 'sm' && 'p-5',
      className
    )}
    {...rest}
  />
);

interface CardHeaderProps {
  eyebrow?: string;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  titleId?: string;
  className?: string;
}

/** Eyebrow + title on the left, optional round icon or action on the right. */
export const CardHeader: React.FC<CardHeaderProps> = ({ eyebrow, title, icon, action, titleId, className }) => (
  <div className={cn('flex items-start justify-between gap-3', className)}>
    <div className="min-w-0">
      {eyebrow && <p className="eyebrow opacity-75">{eyebrow}</p>}
      {title && (
        <h2 id={titleId} className="text-base font-bold leading-snug mt-0.5">
          {title}
        </h2>
      )}
    </div>
    {(icon || action) && (
      <div className="flex items-center gap-2 shrink-0">
        {action}
        {icon && (
          <span aria-hidden="true" className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
            {icon}
          </span>
        )}
      </div>
    )}
  </div>
);

export const BentoGrid: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn('grid grid-cols-12 gap-4', className)} {...rest} />
);
