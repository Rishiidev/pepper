import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#FF3B30"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
    >
      <rect x="0" y="0" width="24" height="12" rx="1" />
      <rect x="16" y="12" width="8" height="8" rx="1" />
      <rect x="0" y="16" width="8" height="8" rx="1" />
    </svg>
  );
};
