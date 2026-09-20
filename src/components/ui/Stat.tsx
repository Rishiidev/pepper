import React from 'react';
import { cn } from './cn';

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  size?: 'lg' | 'md';
  className?: string;
}

/** A number that means something. Only pass values that are measured or clearly labelled estimates. */
export const Stat: React.FC<StatProps> = ({ label, value, hint, size = 'lg', className }) => (
  <div className={className}>
    <p className="eyebrow opacity-75">{label}</p>
    <p className={cn(size === 'lg' ? 'display-number mt-2' : 'text-2xl font-bold tabular-nums mt-1 leading-none')}>{value}</p>
    {hint && <p className="text-xs opacity-75 mt-1.5">{hint}</p>}
  </div>
);
