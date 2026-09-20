import React from 'react';

interface Props {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

/** Decorative trend line. Pair it with text, since it is hidden from screen readers. */
export const Sparkline: React.FC<Props> = ({ values, width = 160, height = 40, className }) => {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" className={className} />;
  const max = Math.max(1, ...values);
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 3 - (v / max) * (height - 8)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className={className}>
      <path d={`${line} L${width} ${height} L0 ${height} Z`} fill="currentColor" fillOpacity={0.14} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
