import React from 'react';

interface PepperLogoProps {
  size?: number;
  className?: string;
  color?: string;
  showText?: boolean;
}

export const PepperLogo: React.FC<PepperLogoProps> = ({
  size = 28,
  className = '',
  color = '#FF4D43',
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 shrink-0 select-none ${className}`}>
      {/* Official Geometric P Mark SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <g fill={color}>
          {/* Top Bar */}
          <rect x="0" y="0" width="24" height="8" />
          {/* Right Shoulder */}
          <rect x="16" y="8" width="8" height="8" />
          {/* Middle Horizontal Bridge */}
          <rect x="8" y="8" width="8" height="4" />
          {/* Bottom Left Stem */}
          <rect x="0" y="12" width="8" height="12" />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-[0.2em] text-[#F4F5F7] uppercase font-mono">
              PEPPER
            </span>
            <span className="text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#171A24] border border-white/10 text-[#8E94A5]">
              OS
            </span>
          </div>
          <span className="text-[9px] tracking-wider text-[#8E94A5] font-medium uppercase mt-0.5">
            Work Memory Engine
          </span>
        </div>
      )}
    </div>
  );
};
