import React from 'react';
import { axisTicks } from '../../core/engines/timeline-replay';

export interface AxisBand {
  id: string;
  from: number;
  to: number;
  label: string;
  selected?: boolean;
  interrupted?: boolean;
}

interface Props {
  from: number;
  to: number;
  bands?: AxisBand[];
  /** Activity per equal slice of the range, drawn as bars */
  bars?: number[];
  cursor?: number;
  onSelectBand?: (id: string) => void;
  className?: string;
}

const hourLabel = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: to2(ts) });
const to2 = (ts: number) => (new Date(ts).getMinutes() === 0 ? undefined : '2-digit');

/** A real time axis: ticks and labels, session bands, activity bars and a cursor. */
export const TimeAxis: React.FC<Props> = ({ from, to, bands = [], bars, cursor, onSelectBand, className }) => {
  const span = Math.max(1, to - from);
  const pct = (ts: number) => `${Math.min(100, Math.max(0, ((ts - from) / span) * 100))}%`;
  const ticks = axisTicks(from, to);
  const max = Math.max(1, ...(bars ?? [0]));

  return (
    <div className={className}>
      <div className="relative h-16 rounded-inner bg-surface-active overflow-hidden">
        {bars && (
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 top-6 flex items-end gap-px px-px">
            {bars.map((b, i) => (
              <span key={i} className="flex-1 rounded-t-sm bg-zone-lilac-accent opacity-60" style={{ height: `${Math.max(b > 0 ? 8 : 0, (b / max) * 100)}%` }} />
            ))}
          </div>
        )}
        {ticks.map((t) => (
          <span key={t} aria-hidden="true" className="absolute top-0 bottom-0 w-px bg-border-strong/60" style={{ left: pct(t), background: 'var(--pp-border-strong)', opacity: 0.5 }} />
        ))}
        {bands.map((b) => (
          <button
            key={b.id}
            type="button"
            aria-label={`Session ${new Date(b.from).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} to ${new Date(b.to).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${b.interrupted ? ', interrupted' : ''}. Select`}
            aria-pressed={!!b.selected}
            onClick={() => onSelectBand?.(b.id)}
            className={`absolute top-1.5 h-5 rounded-full text-xs font-bold px-2 truncate ${b.selected ? 'bg-zone-ink text-zone-ink-fg' : 'bg-zone-lilac text-zone-lilac-fg'}`}
            style={{ left: pct(b.from), width: `max(12px, calc(${pct(b.to)} - ${pct(b.from)}))` }}
          >
            {b.interrupted && <span aria-hidden="true">⚑ </span>}
            {(b.to - b.from) / span > 0.08 ? b.label : ''}
          </button>
        ))}
        {cursor !== undefined && <span aria-hidden="true" className="absolute top-0 bottom-0 w-0.5 bg-text-primary" style={{ left: pct(cursor) }} />}
      </div>
      <div aria-hidden="true" className="relative h-5 mt-1">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2 text-xs text-text-muted whitespace-nowrap" style={{ left: pct(t) }}>
            {hourLabel(t)}
          </span>
        ))}
      </div>
    </div>
  );
};
