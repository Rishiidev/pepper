import React from 'react';

export type LogoState = 'normal' | 'saving' | 'restoring' | 'ai' | 'pinned' | 'syncing';

interface LogoProps {
  size?: number;
  state?: LogoState;
  className?: string;
  showText?: boolean;
}

/**
 * PEPPER Geometric P Logo System
 *
 * Layer 1: Letter P
 * Layer 2: Portal (Doorway into unfinished work)
 * Layer 3: Workspace (Abstract desktop)
 * Layer 4: Memory Block (Saved piece of thinking)
 * Layer 5: Continue / Momentum (The central portal notch)
 */
export const Logo: React.FC<LogoProps> = ({
  size = 28,
  state = 'normal',
  className = '',
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 shrink-0 select-none ${className}`}>
      <div
        className="relative flex items-center justify-center transition-transform duration-300 active:scale-95 cursor-pointer"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-visible"
        >
          {/* Ambient Glow for AI or Restoring State */}
          {(state === 'ai' || state === 'restoring') && (
            <rect
              x="-2"
              y="-2"
              width="28"
              height="28"
              rx="4"
              className="fill-pepper-500/20 blur-sm animate-pulse"
            />
          )}

          {/* Geometric P Solid Fill Shapes */}
          <g className="transition-all duration-300">
            {/* Top Horizontal Bar */}
            <rect x="0" y="0" width="24" height="8" fill="currentColor" />

            {/* Right Shoulder */}
            <rect x="16" y="8" width="8" height="8" fill="currentColor" />

            {/* Middle Horizontal Bridge */}
            <rect x="8" y="8" width="8" height="4" fill="currentColor" />

            {/* Bottom Left Stem */}
            <rect x="0" y="12" width="8" height="12" fill="currentColor" />

            {/* Dynamic Center Portal (Negative Space Accent / Animation Element) */}
            {state === 'saving' ? (
              /* Portal Compressing / Saving animation element */
              <rect
                x="8"
                y="12"
                width="8"
                height="4"
                className="fill-pepper-500 animate-ping opacity-75"
              />
            ) : state === 'restoring' ? (
              /* Portal Expanding / Restoring animation element */
              <rect
                x="8"
                y="12"
                width="8"
                height="4"
                className="fill-pepper-400 animate-bounce"
              />
            ) : state === 'pinned' ? (
              /* Pinned Dot Indicator in Portal Notch */
              <rect x="10" y="13" width="4" height="2" className="fill-pepper-500" />
            ) : state === 'syncing' ? (
              /* Syncing Motion Sweep */
              <rect
                x="8"
                y="12"
                width="8"
                height="4"
                className="fill-pepper-500/60 animate-pulse"
              />
            ) : null}
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-[0.2em] text-text-primary uppercase font-mono">
              PEPPER
            </span>
            <span className="text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-surface-card border border-border text-text-muted">
              OS
            </span>
          </div>
          <span className="text-[9px] tracking-wider text-text-muted font-medium uppercase mt-0.5">
            Work Memory Engine
          </span>
        </div>
      )}
    </div>
  );
};
