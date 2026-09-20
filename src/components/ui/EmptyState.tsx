import React from 'react';
import { Card, Tone } from './Card';

interface Props {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  tone?: Tone;
  className?: string;
}

/** Says what this place is for and what to do next. */
export const EmptyState: React.FC<Props> = ({ icon, title, body, action, tone = 'paper', className }) => (
  <Card tone={tone} className={`flex flex-col items-start gap-3 ${className ?? ''}`}>
    {icon && (
      <span aria-hidden="true" className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
        {icon}
      </span>
    )}
    <div>
      <h3 className="text-base font-bold">{title}</h3>
      {body && <p className="text-sm opacity-80 mt-1 max-w-sm">{body}</p>}
    </div>
    {action}
  </Card>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div aria-hidden="true" className={`rounded-input bg-surface-active ${className ?? 'h-4 w-full'}`} />
);
