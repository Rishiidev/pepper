import React from 'react';

export type LogoState = 'normal' | 'saving' | 'restoring' | 'ai' | 'pinned' | 'syncing';

interface LogoProps {
  size?: number;
  state?: LogoState;
  className?: string;
  showText?: boolean;
}

/** Pepper mark. Canonical geometry lives in assets/logo.svg; do not redraw. */
export const LOGO_PATH = 'M0 0H456V409H194V519H0V262H194V342H262V194H0Z';

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
        style={{ width: size * 456 / 519, height: size }}
      >
        <svg
          width={size * 456 / 519}
          height={size}
          viewBox="0 0 456 519"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-visible"
        >
          {(state === 'ai' || state === 'restoring') && (
            <rect x="-36" y="-36" width="528" height="591" rx="40" className="fill-pepper-500/20" />
          )}
          <path d={LOGO_PATH} fill="currentColor" className="transition-all duration-300" />
        </svg>
      </div>

      {showText && <span className="font-bold text-base tracking-tight text-text-primary">Pepper</span>}
    </div>
  );
};
