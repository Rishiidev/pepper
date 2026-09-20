import React, { useState } from 'react';
import { cn } from './cn';

export interface FaviconItem {
  url: string;
  favIconUrl?: string;
  title?: string;
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const Icon: React.FC<{ item: FaviconItem; size: number; ring: string }> = ({ item, size, ring }) => {
  const [failed, setFailed] = useState(false);
  const letter = (host(item.url)[0] || item.title?.[0] || '?').toUpperCase();
  const style: React.CSSProperties = { width: size, height: size, boxShadow: `0 0 0 2px ${ring}` };
  return (
    <span
      style={style}
      className="relative inline-flex items-center justify-center rounded-full overflow-hidden bg-surface-active text-text-secondary text-xs font-bold shrink-0 -ml-2 first:ml-0"
    >
      {item.favIconUrl && !failed ? (
        <img src={item.favIconUrl} alt="" className="w-full h-full object-cover bg-white" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{letter}</span>
      )}
    </span>
  );
};

interface Props {
  items: FaviconItem[];
  max?: number;
  size?: number;
  /** Surface color the stack sits on, so overlap rings blend in */
  ring?: string;
  className?: string;
  /** Total when `items` is a sample */
  total?: number;
}

/** Overlapping site icons: recognition beats reading a list of titles. */
export const FaviconStack: React.FC<Props> = ({ items, max = 5, size = 28, ring = 'var(--pp-card)', className, total }) => {
  const shown = items.slice(0, max);
  const extra = (total ?? items.length) - shown.length;
  const names = Array.from(new Set(items.map((i) => host(i.url)).filter(Boolean))).slice(0, 4).join(', ');
  return (
    <span role="img" aria-label={names ? `Tabs from ${names}` : 'Tabs'} className={cn('inline-flex items-center', className)}>
      {shown.map((it, i) => (
        <Icon key={`${it.url}-${i}`} item={it} size={size} ring={ring} />
      ))}
      {extra > 0 && (
        <span
          style={{ width: size, height: size, boxShadow: `0 0 0 2px ${ring}` }}
          className="-ml-2 inline-flex items-center justify-center rounded-full bg-surface-active text-text-secondary text-xs font-bold"
        >
          +{extra}
        </span>
      )}
    </span>
  );
};
