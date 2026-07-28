import React from 'react';
import { Zap } from 'lucide-react';

interface RamBadgeProps {
  mbSaved: number;
  label?: string;
  className?: string;
}

export const RamBadge: React.FC<RamBadgeProps> = ({ mbSaved, label = 'SAVABLE', className = '' }) => {
  const formatted = mbSaved >= 1024 ? `${(mbSaved / 1024).toFixed(1)} GB` : `${mbSaved} MB`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-pepper-500/10 border border-pepper-500/20 text-pepper-400 ${className}`}
      title="Estimated Memory (RAM) Saved"
    >
      <Zap className="w-3 h-3 text-pepper-500 animate-pulse" />
      <span>{formatted}</span>
      {label && <span className="opacity-70 text-[9px] uppercase tracking-wider">{label}</span>}
    </span>
  );
};
