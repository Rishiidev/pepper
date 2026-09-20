import React, { useEffect, useRef, useState } from 'react';
import { cn } from './cn';

export interface MenuItem {
  label: string;
  onSelect: () => void | Promise<void>;
  icon?: React.ReactNode;
  danger?: boolean;
  checked?: boolean;
}

interface Props {
  trigger: React.ReactNode;
  triggerLabel: string;
  items: MenuItem[];
  className?: string;
  triggerClassName?: string;
}

/** Popover menu with arrow-key navigation. Positioned fixed so scrolling lists never clip it. */
export const Menu: React.FC<Props> = ({ trigger, triggerLabel, items, className, triggerClassName }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 8 });
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
      root.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const els = Array.from(list.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? []);
      const i = els.indexOf(document.activeElement as HTMLElement);
      els[(i + (e.key === 'ArrowDown' ? 1 : els.length - 1)) % els.length]?.focus();
    }
  };

  return (
    <div ref={root} className={cn('relative inline-block', className)} onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        title={triggerLabel}
        className={triggerClassName}
        onClick={(e) => {
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          const right = Math.max(8, window.innerWidth - r.right);
          setPos(r.bottom > window.innerHeight - 280 ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
          setOpen((o) => !o);
        }}
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={list}
          role="menu"
          aria-label={triggerLabel}
          style={pos}
          className="fixed z-50 min-w-48 max-h-72 overflow-y-auto rounded-inner border border-border bg-surface-card p-1 shadow-xl"
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await it.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-input px-3 py-2 text-left text-sm hover:bg-surface-hover',
                it.danger ? 'text-pepper-400' : 'text-text-primary'
              )}
            >
              {it.icon}
              <span className="flex-1">{it.label}</span>
              {it.checked && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
